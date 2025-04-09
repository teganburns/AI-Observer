# API Usage Documentation

This document describes the available API endpoints for the AI Observer application. The server runs on `http://localhost:5001` by default.

## Interactive Web Interface

For most users, the recommended way to interact with AI Observer is through the web interface:

1. Start the server (if not already running):
   ```bash
   source venv/bin/activate
   python main.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5001
   ```

The web interface provides a user-friendly dashboard where you can:
- Capture frames from your video device
- View and manage your captures
- Send images to OpenAI for analysis
- View AI responses
- Archive and organize your captures
- Monitor system statistics and logs

## API Documentation

The following API documentation is primarily intended for developers who want to:
- Build custom integrations
- Automate interactions with AI Observer
- Test and debug the system
- Develop new features

If you're just getting started, we recommend using the web interface above instead.

## Testing Prerequisites

Before testing the endpoints:
1. Ensure the server is running in the virtual environment:
   ```bash
   source venv/bin/activate
   python main.py
   ```
2. MongoDB service is active
3. Your `.env` file is properly configured
4. Your video capture device is connected

## Quick Start: Testing the API

The easiest way to test the API is using our provided test script:

```bash
# Make sure you're in the project directory
cd AI-Observer

# Make the script executable if you haven't already
chmod +x test_endpoints.sh

# View available test options
./test_endpoints.sh

# Examples:
./test_endpoints.sh capture              # Capture a frame
./test_endpoints.sh sendrequest message="What do you see in this image?"  # Send to OpenAI
./test_endpoints.sh recentcaptures       # View recent captures
./test_endpoints.sh archivedcaptures     # View archived captures
./test_endpoints.sh stats                # View system statistics
```

The script provides a user-friendly way to test all endpoints and verify your setup is working correctly.

## Available Endpoints

Below is a list of all available endpoints. While you can call these directly using curl (see [Direct API Access](#direct-api-access)), we recommend using our test script above for verification.

### Video Frame Capture
- **Endpoint**: `/capture`
- **Method**: POST
- **Description**: Captures a frame from the video capture device and saves it to the database
- **Response Format**: 
  ```json
  {
    "status": "success",
    "message": "Video frame captured and saved with ID: <capture_id>",
    "capture_id": "<capture_id>"
  }
  ```

### Send Request to OpenAI
- **Endpoint**: `/send_request`
- **Method**: POST
- **Description**: Processes the most recent captures and sends them to OpenAI with your message
- **Response Format**:
  ```json
  {
    "status": "success",
    "response": {
      // OpenAI response data
    },
    "response_id": "<response_id>"
  }
  ```

### Recent Captures
- **Endpoint**: `/recent_captures`
- **Method**: GET
- **Description**: Retrieves recent (unarchived) captures from the database
- **Response Format**: Array of capture objects
  ```json
  [
    {
      "_id": "<capture_id>",
      "timestamp": "2024-03-21T10:30:00Z",
      "image_data": "<base64_encoded_image>",
      "archived": false
    }
  ]
  ```

### Recent Responses
- **Endpoint**: `/recent_responses`
- **Method**: GET
- **Description**: Retrieves recent OpenAI responses
- **Response Format**: Array of response objects
  ```json
  [
    {
      "_id": "<response_id>",
      "timestamp": "2024-03-21T10:30:00Z",
      "message": "Original query message",
      "response_data": {
        // OpenAI response data
      },
      "capture_ids": ["<capture_id1>", "<capture_id2>"]
    }
  ]
  ```

### Archived Captures
- **Endpoint**: `/archived_captures`
- **Method**: GET
- **Description**: Retrieves archived captures from the database
- **Response Format**: Array of archived capture objects
  ```json
  [
    {
      "_id": "<capture_id>",
      "date": "2024-03-21",
      "filename": "<filename>",
      "image_data": "<base64_encoded_image>"
    }
  ]
  ```

### Move Image
- **Endpoint**: `/move_image`
- **Method**: POST
- **Description**: Moves an image between recent and archived sections
- **Response Format**:
  ```json
  {
    "status": "success",
    "message": "Image archived|unarchived"
  }
  ```

### Delete Image
- **Endpoint**: `/delete_image`
- **Method**: POST
- **Description**: Deletes a capture from the database
- **Response Format**:
  ```json
  {
    "status": "success",
    "message": "Image deleted successfully"
  }
  ```

### Delete Response
- **Endpoint**: `/delete_response`
- **Method**: POST
- **Description**: Deletes a response from the database
- **Response Format**:
  ```json
  {
    "status": "success",
    "message": "Response deleted successfully"
  }
  ```

### Server Logs
- **Endpoint**: `/server_logs`
- **Method**: GET
- **Description**: Retrieves server logs
- **Response**: Server log entries in text format

## Error Handling

All endpoints follow a consistent error response format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request (missing or invalid parameters)
- 404: Not Found
- 500: Internal Server Error

## Direct API Access

If you need to access the API endpoints directly (for development or integration purposes), detailed curl examples are available in our [API Examples](API_EXAMPLES.md) document.

## Dashboard Routes

### System Statistics
- **Endpoint**: `/api/stats`
- **Method**: GET
- **Description**: Retrieves system statistics including capture and response counts
- **Response**: Object containing total stats and hourly stats

### API Routes
- **Endpoint**: `/api/routes`
- **Method**: GET
- **Description**: Lists all available API routes and their documentation
- **Response**: Array of route objects with name, path, and documentation

### System Information
- **Endpoint**: `/api/system`
- **Method**: GET
- **Description**: Retrieves system information including MongoDB stats and server configuration
- **Response**: Object containing folders, storage, server, and MongoDB information

### Server Logs
- **Endpoint**: `/api/logs`
- **Method**: GET
- **Description**: Retrieves the last 1000 lines of server logs

## Testing Endpoints

A shell script `test_endpoint.sh` is provided for testing the API endpoints. Usage:

```bash
./test_endpoint.sh <endpoint> [args...]
```

Example usage:
```bash
# Capture a screenshot
./test_endpoint.sh capture

# Send a request to OpenAI
./test_endpoint.sh sendrequest message="What do you see in this image?"

# Move an image to archive
./test_endpoint.sh moveimage image_id=123 action=archive

# Get system stats
./test_endpoint.sh stats
``` 