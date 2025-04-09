import requests
import json
import time
from pathlib import Path
from tqdm import tqdm

def simulate_loading(description):
    """Simulates a loading bar for 3 seconds"""
    for _ in tqdm(range(30), desc=description, ncols=100):
        time.sleep(0.1)

def test_image_workflow():
    """
    Test the complete workflow:
    1. Capture a screenshot
    2. Get the capture ID and verify the image exists
    3. Send the image to ChatGPT (this automatically moves it to archive)
    4. Verify the image exists in archive
    5. Delete the archived image
    6. Verify the image is gone
    """
    BASE_URL = "http://localhost:5001"
    
    print("\n=== Starting Image Workflow Test ===")
    
    # Step 1: Capture a screenshot
    print("\n1. Capturing screenshot...")
    simulate_loading("Capturing screenshot")
    capture_response = requests.post(f"{BASE_URL}/capture")
    assert capture_response.status_code == 200, "Failed to capture screenshot"
    capture_data = capture_response.json()
    capture_id = capture_data['capture_id']
    print(f"✓ Screenshot captured with ID: {capture_id}")
    
    # Step 2: Get recent captures and verify our image exists
    print("\n2. Verifying image in recent captures...")
    simulate_loading("Verifying recent captures")
    recent_response = requests.get(f"{BASE_URL}/recent_captures")
    assert recent_response.status_code == 200, "Failed to get recent captures"
    recent_captures = recent_response.json()
    assert any(capture['_id'] == capture_id for capture in recent_captures), "Captured image not found in recent captures"
    print("✓ Image found in recent captures")

    # Step 3: Send request to ChatGPT (this will automatically archive the image)
    print("\n3. Sending request to ChatGPT...")
    simulate_loading("Sending to ChatGPT")
    send_response = requests.post(
        f"{BASE_URL}/send_request",
        json={'message': "What's in the image?"}
    )
    assert send_response.status_code == 200, "Failed to send request to ChatGPT"
    response_data = send_response.json()
    print("✓ Request sent to ChatGPT successfully")
    print("\nChatGPT Response:")
    print("-" * 50)
    try:
        response_content = response_data['response']['choices'][0]['message']['content']
        print(response_content)
    except (KeyError, IndexError) as e:
        print("Could not extract response content. Raw response:")
        print(json.dumps(response_data, indent=2))
    print("-" * 50)
    
    # Step 4: Verify image in archived captures
    print("\n4. Verifying image in archived captures...")
    simulate_loading("Verifying archived captures")
    try:
        archive_response = requests.get(f"{BASE_URL}/archived_captures")
        assert archive_response.status_code == 200, "Failed to get archived captures"
        
        try:
            archived_captures = archive_response.json()
            print(f"Archive response type: {type(archived_captures)}")
            print(f"Archive response content: {json.dumps(archived_captures, indent=2)[:500]}...")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response: {e}")
            print(f"Raw response content: {archive_response.content[:500]}...")
            raise
            
        try:
            image_name = f"{capture_id}.png"
            if isinstance(archived_captures, list):
                image_found = any(
                    (isinstance(capture, dict) and capture.get('_id') == capture_id) or
                    (isinstance(capture, str) and capture == image_name)
                    for capture in archived_captures
                )
            else:
                print(f"Unexpected response format. Expected list but got {type(archived_captures)}")
                image_found = False
                
            assert image_found, "Image not found in archived captures"
            print("✓ Image found in archived captures")
        except AssertionError as e:
            print(f"Error: {e}")
            print(f"Looking for image with name: {image_name} or ID: {capture_id}")
            print(f"Response type: {type(archived_captures)}")
            if isinstance(archived_captures, list):
                print(f"Number of archived captures: {len(archived_captures)}")
                print(f"First few archived captures: {json.dumps(archived_captures[:2], indent=2)}")
            raise
            
    except requests.RequestException as e:
        print(f"Network error during archive verification: {e}")
        raise
    
    # Step 5: Delete the archived image
    print("\n5. Deleting archived image...")
    simulate_loading("Deleting archived image")
    delete_response = requests.post(
        f"{BASE_URL}/delete_image",
        json={'image_id': capture_id, 'source': 'archived'}
    )
    assert delete_response.status_code == 200, "Failed to delete image"
    print("✓ Image deleted successfully")
    
    # Step 6: Verify image is gone from archived captures
    print("\n6. Verifying image deletion...")
    simulate_loading("Verifying deletion")
    final_archive_response = requests.get(f"{BASE_URL}/archived_captures")
    assert final_archive_response.status_code == 200, "Failed to get archived captures"
    final_archived_captures = final_archive_response.json()
    assert f"{capture_id}.png" not in final_archived_captures, "Image still exists in archived captures"
    print("✓ Image successfully removed from archived captures")
    
    print("\n=== Image Workflow Test Completed Successfully ===")

if __name__ == "__main__":
    test_image_workflow() 