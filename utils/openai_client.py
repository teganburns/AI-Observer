import os
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
from openai import OpenAI
from openai.types.chat import ChatCompletion

class OpenAIClient:
    """Wrapper for OpenAI API client."""
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        self.client = OpenAI(api_key=api_key)

    def upload_file(self, file_path: Path) -> Optional[Any]:
        """Upload a file to OpenAI."""
        try:
            with open(file_path, "rb") as f:
                uploaded_file = self.client.files.create(
                    file=f,
                    purpose="vision"
                )
            logging.info(f"File uploaded: {uploaded_file.filename} (ID: {uploaded_file.id})")
            return uploaded_file
        except Exception as e:
            logging.error(f"Error uploading file to OpenAI: {e}")
            return None

    def process_request(self, message: str, images: List[Dict[str, Any]]) -> ChatCompletion:
        """Process a request with OpenAI API."""
        openai_messages = [{
            "role": "user",
            "content": [{"type": "text", "text": message}] + images
        }]

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=openai_messages,
                response_format={"type": "text"},
                temperature=1,
                max_tokens=2048,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0
            )
            return response
            
        except Exception as e:
            logging.error(f"Error processing request: {e}")
            raise 