from flask import Blueprint, render_template, jsonify, Response, current_app
from datetime import datetime, timedelta
from typing import Dict, Any, List
import inspect
import os
import logging

from utils.db import MongoDB
from routes.special_routes import SpecialRoutes

dashboard = Blueprint('dashboard', __name__,
                     template_folder='templates',
                     static_folder='static')

class Dashboard:
    def __init__(self, config: Any):
        self.config = config
        self.db = MongoDB()

    def register_routes(self) -> None:
        """Register all dashboard routes."""
        dashboard.add_url_rule('/dashboard', 'dashboard',
                             view_func=self.show_dashboard)
        dashboard.add_url_rule('/api/stats', 'get_stats',
                             view_func=self.get_stats)
        dashboard.add_url_rule('/api/routes', 'get_routes',
                             view_func=self.get_routes)
        dashboard.add_url_rule('/api/system', 'get_system_info',
                             view_func=self.get_system_info)
        dashboard.add_url_rule('/api/logs', 'get_logs',
                             view_func=self.get_logs)

    def show_dashboard(self) -> Response:
        """Render the dashboard page."""
        return render_template('dashboard.html')

    def get_stats(self) -> Response:
        """Get system statistics."""
        try:
            now = datetime.now()
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Get capture statistics
            total_captures = self.db.captures.count_documents({})
            today_captures = self.db.captures.count_documents({
                'timestamp': {'$gte': today}
            })
            
            # Get response statistics
            total_responses = self.db.responses.count_documents({})
            today_responses = self.db.responses.count_documents({
                'timestamp': {'$gte': today}
            })
            
            # Get hourly statistics for the last 24 hours
            hourly_stats = []
            for i in range(24):
                hour_start = now - timedelta(hours=i+1)
                hour_end = now - timedelta(hours=i)
                captures = self.db.captures.count_documents({
                    'timestamp': {
                        '$gte': hour_start,
                        '$lt': hour_end
                    }
                })
                responses = self.db.responses.count_documents({
                    'timestamp': {
                        '$gte': hour_start,
                        '$lt': hour_end
                    }
                })
                hourly_stats.append({
                    'hour': hour_start.strftime('%H:00'),
                    'captures': captures,
                    'responses': responses
                })
            
            # Get storage statistics
            captures_size = sum(doc.get('image_data', '').__sizeof__() 
                              for doc in self.db.captures.find({}, {'image_data': 1}))
            responses_size = sum(doc.get('response_data', {}).__sizeof__() 
                               for doc in self.db.responses.find({}, {'response_data': 1}))
            
            return jsonify({
                'total_stats': {
                    'captures': total_captures,
                    'responses': total_responses,
                    'today_captures': today_captures,
                    'today_responses': today_responses,
                    'storage_usage': {
                        'captures': captures_size,
                        'responses': responses_size,
                        'total': captures_size + responses_size
                    }
                },
                'hourly_stats': hourly_stats
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def get_routes(self) -> Response:
        """Get information about available routes."""
        try:
            routes = []
            
            # Get all routes from the application
            for rule in current_app.url_map.iter_rules():
                # Skip static files
                if rule.endpoint == 'static':
                    continue
                    
                # Get the view function
                view_func = current_app.view_functions[rule.endpoint]
                
                # Get documentation and clean it
                doc = inspect.getdoc(view_func) or "No documentation available"
                # Clean doc to only include alphanumeric and basic punctuation
                doc = ' '.join(doc.split())  # Normalize whitespace
                doc = ''.join(c for c in doc if c.isalnum() or c in ' .,').strip()
                
                # For static routes, simplify the doc
                if 'static' in rule.endpoint:
                    doc = "Serve static files"
                
                # Get route category
                route_category = 'api' if 'special_routes.' in rule.endpoint else 'dashboard' if 'dashboard.' in rule.endpoint else 'lander'
                
                # Get HTTP methods
                methods = list(rule.methods - {'HEAD', 'OPTIONS'})
                
                routes.append({
                    'name': rule.endpoint.split('.')[-1],
                    'path': rule.rule,
                    'doc': doc,
                    'category': route_category,
                    'type': methods[0] if methods else 'GET'  # Use first method, default to GET
                })
            
            return jsonify(routes), 200
            
        except Exception as e:
            logging.error(f"Error getting routes: {e}")
            return jsonify({'error': str(e)}), 500

    def get_system_info(self) -> Response:
        """Get system information."""
        try:
            # Get MongoDB statistics
            # Recent captures are those that are not archived
            recent_captures = self.db.captures.count_documents({
                '$or': [
                    {'archived': False},
                    {'archived': {'$exists': False}}  # Include documents where archived field doesn't exist
                ]
            })
            
            # Archived captures have archived=True
            archived_captures = self.db.captures.count_documents({
                'archived': True
            })
            
            # Count all responses
            recent_responses = self.db.responses.count_documents({})

            return jsonify({
                'folders': {
                    'logs': str(self.config.LOG_FILE)
                },
                'storage': {
                    'total_size': 0  # Now using MongoDB for storage
                },
                'server': {
                    'port': self.config.PORT,
                    'debug': True
                },
                'mongodb': {
                    'recent_captures': recent_captures,
                    'archived_captures': archived_captures,
                    'recent_responses': recent_responses
                }
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    def get_logs(self) -> Response:
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
                
                # Take last 1000 lines
                logs = '\n'.join(lines[-1000:])
                return logs

        except Exception as e:
            return str(e), 500 