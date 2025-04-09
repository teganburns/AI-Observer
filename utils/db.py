import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
import base64

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from bson import ObjectId

class MongoDB:
    """MongoDB client wrapper for handling database operations."""
    
    def __init__(self) -> None:
        """Initialize MongoDB connection."""
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        self.client = MongoClient(mongo_uri)
        self.db: Database = self.client.ai_observer
        self.captures: Collection = self.db.captures
        self.responses: Collection = self.db.responses
        
        # Create indexes
        self.captures.create_index("timestamp")
        self.captures.create_index("archived")  # Add index for archived status
        self.responses.create_index("timestamp")
        self.responses.create_index("capture_ids")

    def save_capture(self, image_path: Path) -> Optional[str]:
        """Save capture information to database."""
        try:
            # Read the image file as binary
            with open(image_path, 'rb') as img_file:
                image_binary = img_file.read()
            
            # Create capture document
            capture = {
                'filename': image_path.name,
                'timestamp': datetime.now(),
                'image_data': base64.b64encode(image_binary).decode('utf-8'),
                'file_type': image_path.suffix[1:],  # Remove the dot from extension
                'original_path': str(image_path),
                'archived': False  # Add archived status
            }
            
            result = self.captures.insert_one(capture)
            logging.info(f"Saved capture to database with ID: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logging.error(f"Error saving capture to database: {e}")
            return None

    def save_response(self, response_data: Dict[str, Any]) -> Optional[str]:
        """Save OpenAI response to database."""
        try:
            # Create response document
            response = {
                'timestamp': response_data.get('timestamp', datetime.now()),
                'message': response_data.get('message', ''),
                'response_data': response_data.get('response_data', {}),
                'capture_ids': [ObjectId(id) for id in response_data.get('capture_ids', [])]
            }
            
            result = self.responses.insert_one(response)
            logging.info(f"Saved response to database with ID: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logging.error(f"Error saving response to database: {e}")
            return None

    def get_capture(self, capture_id: str) -> Optional[Dict[str, Any]]:
        """Get a capture from the database."""
        try:
            result = self.captures.find_one({'_id': ObjectId(capture_id)})
            return result
        except Exception as e:
            logging.error(f"Error getting capture from database: {e}")
            return None

    def get_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a response by ID."""
        try:
            response = self.responses.find_one({'_id': ObjectId(response_id)})
            return response
        except Exception as e:
            logging.error(f"Error retrieving response from database: {e}")
            return None

    def get_recent_captures(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent captures."""
        return list(self.captures.find({
            '$or': [
                {'archived': False},
                {'archived': {'$exists': False}}  # Include documents where archived field doesn't exist
            ]
        }).sort('timestamp', -1).limit(limit))

    def get_recent_responses(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent responses."""
        return list(self.responses.find().sort('timestamp', -1).limit(limit))

    def save_capture_data(self, image_data: bytes) -> Optional[str]:
        """Save raw image data to database."""
        try:
            # Create capture document
            capture = {
                'timestamp': datetime.now(),
                'image_data': base64.b64encode(image_data).decode('utf-8'),
                'file_type': 'png',  # Default to PNG for raw data
                'archived': False  # Add archived status
            }
            
            result = self.captures.insert_one(capture)
            logging.info(f"Saved capture data to database with ID: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logging.error(f"Error saving capture data to database: {e}")
            return None

    def get_archived_captures(self) -> List[Dict[str, Any]]:
        """Get all archived captures from the database."""
        try:
            return list(self.captures.find({'archived': True}).sort('timestamp', -1))
        except Exception as e:
            logging.error(f"Error getting archived captures: {e}")
            return []

    def archive_capture(self, capture_id: str) -> bool:
        """Mark a capture as archived in the database."""
        try:
            result = self.captures.update_one(
                {'_id': ObjectId(capture_id)},
                {'$set': {'archived': True}}
            )
            return result.modified_count > 0
        except Exception as e:
            logging.error(f"Error archiving capture: {e}")
            return False

    def unarchive_capture(self, capture_id: str) -> bool:
        """Mark a capture as not archived in the database."""
        try:
            result = self.captures.update_one(
                {'_id': ObjectId(capture_id)},
                {'$set': {'archived': False}}
            )
            return result.modified_count > 0
        except Exception as e:
            logging.error(f"Error unarchiving capture: {e}")
            return False

    def delete_capture(self, capture_id: str) -> bool:
        """Delete a capture from the database."""
        try:
            result = self.captures.delete_one({'_id': ObjectId(capture_id)})
            success = result.deleted_count > 0
            if success:
                logging.info(f"Deleted capture {capture_id} from database")
            return success
        except Exception as e:
            logging.error(f"Error deleting capture from database: {e}")
            return False

    def delete_response(self, response_id: str) -> bool:
        """Delete a response from the database."""
        try:
            result = self.responses.delete_one({'_id': ObjectId(response_id)})
            success = result.deleted_count > 0
            if success:
                logging.info(f"Deleted response {response_id} from database")
            else:
                logging.warning(f"No response found with ID {response_id}")
            return success
        except Exception as e:
            logging.error(f"Error deleting response from database: {e}")
            return False 