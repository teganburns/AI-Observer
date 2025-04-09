# Direct API Access Examples

This document provides detailed examples for directly accessing the API endpoints using curl commands. For general testing and verification, we recommend using our `test_endpoints.sh` script instead.

## Prerequisites

Ensure the server is running at `http://localhost:5001` before trying these examples.

## Video Frame Capture

Capture a frame from the video device:
```bash
curl -X POST http://localhost:5001/capture
```

## OpenAI Integration

Send captured frames to OpenAI for analysis:
```bash
curl -X POST http://localhost:5001/send_request \
  -H "Content-Type: application/json" \
  -d '{"message": "What do you see in this image?"}'
```

## Image Management

### Get Recent Captures
```bash
curl http://localhost:5001/recent_captures
```

### Get Recent OpenAI Responses
```bash
curl http://localhost:5001/recent_responses
```

### Get Archived Captures
```bash
curl http://localhost:5001/archived_captures
```

### Move Images Between States

Archive an image:
```bash
curl -X POST http://localhost:5001/move_image \
  -H "Content-Type: application/json" \
  -d '{"image_id": "<image_id>", "action": "archive"}'
```

Unarchive an image:
```bash
curl -X POST http://localhost:5001/move_image \
  -H "Content-Type: application/json" \
  -d '{"image_id": "<image_id>", "action": "unarchive"}'
```

### Delete Images

Delete a specific image:
```bash
curl -X POST http://localhost:5001/delete_image \
  -H "Content-Type: application/json" \
  -d '{"image_id": "<image_id>"}'
```

Delete a specific response:
```bash
curl -X POST http://localhost:5001/delete_response \
  -H "Content-Type: application/json" \
  -d '{"response_id": "<response_id>"}'
```

## System Information

### Get Server Logs
```bash
curl http://localhost:5001/server_logs
```

### Get System Statistics
```bash
curl http://localhost:5001/api/stats
```

### Get API Routes
```bash
curl http://localhost:5001/api/routes
```

### Get System Information
```bash
curl http://localhost:5001/api/system
```

## Working with Response Data

### Processing JSON Responses

For better readability of JSON responses, you can pipe the output through Python's json.tool:
```bash
curl http://localhost:5001/recent_captures | python -m json.tool
```

### Saving Response Data

Save response to a file:
```bash
curl http://localhost:5001/recent_captures > captures.json
```

## Error Handling

All endpoints return appropriate HTTP status codes and JSON error messages when something goes wrong:

```bash
# Example of handling errors
curl -i -X POST http://localhost:5001/move_image \
  -H "Content-Type: application/json" \
  -d '{"image_id": "invalid_id", "action": "archive"}'
```

## Notes

- Replace `<image_id>` and `<response_id>` with actual IDs from your system
- All POST requests should include the `Content-Type: application/json` header
- For endpoints that return large amounts of data (like `/server_logs`), consider using pagination or limiting the output 