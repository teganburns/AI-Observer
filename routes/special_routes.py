from flask import Blueprint, jsonify, Response, request, send_file, current_app
import logging
import base64
from typing import Dict, Any, List
import cv2
import numpy as np
from PIL import Image
import io
from datetime import datetime
from pathlib import Path
import os
import json
from bson import ObjectId

from utils.openai_client import OpenAIClient
from utils.db import MongoDB
from config import Config

special_routes = Blueprint('special_routes', __name__)
db = MongoDB()
openai_client = OpenAIClient()

class SpecialRoutes:
    def __init__(self, config: Any, openai_client: OpenAIClient):
        self.config = config
        self.openai_client = openai_client
        self.db = MongoDB()
        # Initialize video capture device
        self.cap = None
        self.device_id = 0  # Default to first video device

    def register_routes(self) -> None:
        """Register all routes with their handlers."""
        special_routes.add_url_rule('/capture', 'capture', 
                                  view_func=self.capture, 
                                  methods=['POST'])
        special_routes.add_url_rule('/send_request', 'send_request', 
                                  view_func=self.send_request, 
                                  methods=['POST'])
        special_routes.add_url_rule('/recent_captures', 'recent_captures',
                                  view_func=self.get_recent_captures,
                                  methods=['GET'])
        special_routes.add_url_rule('/recent_responses', 'recent_responses',
                                  view_func=self.get_recent_responses,
                                  methods=['GET'])
        special_routes.add_url_rule('/archived_captures', 'archived_captures',
                                  view_func=self.get_archived_captures,
                                  methods=['GET'])
        special_routes.add_url_rule('/move_image', 'move_image',
                                  view_func=self.move_image,
                                  methods=['POST'])
        special_routes.add_url_rule('/delete_image', 'delete_image',
                                  view_func=self.delete_image,
                                  methods=['POST'])
        special_routes.add_url_rule('/delete_response', 'delete_response',
                                  view_func=self.delete_response,
                                  methods=['POST'])
        special_routes.add_url_rule('/server_logs', 'server_logs',
                                  view_func=self.get_server_logs,
                                  methods=['GET'])

    def capture(self) -> Response:
        """Capture an image from the video device and save to database."""
        try:
            logging.info("Starting video capture process")
            
            # Initialize capture device if not already initialized
            if self.cap is None:
                self.cap = cv2.VideoCapture(self.device_id)
                if not self.cap.isOpened():
                    raise Exception("Failed to open video capture device")
            
            # Capture frame
            ret, frame = self.cap.read()
            if not ret:
                raise Exception("Failed to capture frame from video device")
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            image = Image.fromarray(frame_rgb)
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()

            # Save directly to database
            capture_id = self.db.save_capture_data(img_byte_arr)
            if not capture_id:
                return jsonify({
                    "status": "error",
                    "message": "Failed to save capture to database"
                }), 500

            logging.info(f"Video frame captured and saved with ID: {capture_id}")
            return jsonify({
                "status": "success",
                "message": f"Video frame captured and saved with ID: {capture_id}",
                "capture_id": capture_id
            }), 200

        except Exception as e:
            logging.error(f"Error during video capture: {e}")
            # Clean up capture device on error
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    def send_request(self) -> Response:
        """Process captures and send to OpenAI."""
        try:
            data = request.json
            if not data or 'message' not in data:
                return jsonify({"error": "Missing 'message' in request body"}), 400

            message = data['message']
            logging.info(f"Processing send_request with message: {message}")

            # Get recent captures from database
            recent_captures = self.db.get_recent_captures(limit=5)  # Get last 5 captures
            if not recent_captures:
                return jsonify({"error": "No captures found"}), 400

            # Process images
            base64_images = []
            capture_ids = []
            for capture in recent_captures:
                base64_images.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{capture['image_data']}"
                    }
                })
                capture_ids.append(str(capture['_id']))

            # Get OpenAI response
            response = self.openai_client.process_request(message, base64_images)
            
            # Convert response to dict if it's not already
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
            else:
                response_dict = response

            logging.info(f"Received response from OpenAI: {response_dict}")

            # Save response to database
            response_id = self.db.save_response({
                'message': message,
                'response_data': response_dict,
                'capture_ids': capture_ids,
                'timestamp': datetime.now()
            })
            
            if not response_id:
                return jsonify({"error": "Failed to save response to database"}), 500

            # Archive all the captures that were sent to OpenAI
            for capture_id in capture_ids:
                self.db.archive_capture(capture_id)
                logging.info(f"Archived capture {capture_id} after OpenAI request")

            logging.info(f"Saved response to database with ID: {response_id}")
            return jsonify({
                "status": "success",
                "response": response_dict,
                "response_id": response_id
            }), 200

        except Exception as e:
            logging.error(f"Error processing send_request: {e}")
            return jsonify({"error": str(e)}), 500

    def get_recent_captures(self) -> Response:
        """Get recent captures from database."""
        try:
            captures = self.db.get_recent_captures()
            # Convert ObjectId to string for JSON serialization
            for capture in captures:
                capture['_id'] = str(capture['_id'])
            return jsonify(captures), 200
        except Exception as e:
            logging.error(f"Error getting recent captures: {e}")
            return jsonify({"error": str(e)}), 500

    def get_recent_responses(self) -> Response:
        """Get recent responses from database."""
        try:
            responses = self.db.get_recent_responses()
            formatted_responses = []
            
            # Convert ObjectId to string for JSON serialization and format response
            for response in responses:
                formatted_response = {
                    '_id': str(response['_id']),
                    'timestamp': response['timestamp'],
                    'response_data': response.get('response_data', {}),
                    'capture_ids': [str(id) for id in response.get('capture_ids', [])]
                }
                formatted_responses.append(formatted_response)
                
            logging.info(f"Retrieved {len(formatted_responses)} recent responses")
            return jsonify(formatted_responses), 200
            
        except Exception as e:
            logging.error(f"Error getting recent responses: {e}")
            return jsonify({"error": str(e)}), 500

    def get_archived_captures(self) -> Response:
        """Get archived captures from the database."""
        try:
            captures = self.db.get_archived_captures()
            # Convert ObjectId to string for JSON serialization
            for capture in captures:
                capture['_id'] = str(capture['_id'])
            return jsonify(captures), 200
        except Exception as e:
            logging.error(f"Error getting archived captures: {e}")
            return jsonify({"error": str(e)}), 500

    def move_image(self) -> Response:
        """Move an image between recent and archived sections."""
        try:
            data = request.get_json()
            if not data or 'image_id' not in data or 'action' not in data:
                logging.error("Missing required fields in move_image request")
                return jsonify({'error': 'Missing required fields'}), 400

            image_id = data['image_id']
            action = data['action']
            logging.info(f"Moving image {image_id} with action {action}")

            if action == 'archive':
                # Update image status in database
                if self.db.archive_capture(image_id):
                    return jsonify({'status': 'success', 'message': 'Image archived'}), 200
                else:
                    return jsonify({'error': 'Failed to archive image'}), 500

            elif action == 'unarchive':
                # Update image status in database
                if self.db.unarchive_capture(image_id):
                    return jsonify({'status': 'success', 'message': 'Image unarchived'}), 200
                else:
                    return jsonify({'error': 'Failed to unarchive image'}), 500

            else:
                return jsonify({'error': 'Invalid action'}), 400

        except Exception as e:
            logging.error(f"Error moving image: {e}")
            return jsonify({'error': str(e)}), 500

    def delete_image(self) -> Response:
        """Delete an image from the database."""
        try:
            data = request.get_json()
            if not data or 'image_id' not in data:
                return jsonify({'error': 'Missing required fields'}), 400

            image_id = data['image_id']

            if self.db.delete_capture(image_id):
                return jsonify({'status': 'success'}), 200
            else:
                return jsonify({'error': 'Image not found'}), 404

        except Exception as e:
            logging.error(f"Error deleting image: {e}")
            return jsonify({'error': str(e)}), 500

    def delete_response(self) -> Response:
        """Delete a response."""
        try:
            data = request.get_json()
            if not data or 'response_id' not in data:
                return jsonify({'error': 'Missing response_id'}), 400

            response_id = data['response_id']
            if self.db.delete_response(response_id):
                return jsonify({'status': 'success'}), 200
            else:
                return jsonify({'error': 'Response not found'}), 404

        except Exception as e:
            logging.error(f"Error deleting response: {e}")
            return jsonify({'error': str(e)}), 500

    def get_server_logs(self) -> Response:
        """Get the last 1000 lines of server logs."""
        try:
            if not os.path.exists(self.config.LOG_FILE):
                return "No logs available", 404

            # Read the last 1000 lines of the log file
            with open(self.config.LOG_FILE, 'r') as f:
                # Move to end of file and get position
                f.seek(0, 2)
                file_size = f.tell()
                
                # Start from end and read chunks until we have 1000 lines or reach start
                lines = []
                chunk_size = 4096
                position = file_size
                
                while len(lines) < 1000 and position > 0:
                    # Move back one chunk or to start of file
                    chunk_pos = max(position - chunk_size, 0)
                    f.seek(chunk_pos)
                    
                    # Read chunk
                    chunk = f.read(position - chunk_pos)
                    
                    # Count lines in chunk
                    lines = chunk.splitlines() + lines
                    position = chunk_pos
                    
                    # If at start of file, break
                    if chunk_pos == 0:
                        break
                
                # Take last 1000 lines and reverse them for chronological order (newest first)
                logs = '\n'.join(reversed(lines[-1000:]))
                return logs

        except Exception as e:
            return str(e), 500 