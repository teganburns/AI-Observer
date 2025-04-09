import os
from pathlib import Path

class Config:
    # Base directory for the application
    BASE_DIR = Path(__file__).resolve().parent

    # MongoDB configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    MONGODB_DB = os.getenv('MONGODB_DB', 'ai_observer')

    # OpenAI configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    # Flask configuration
    DEBUG = True
    PORT = 5001
    HOST = '0.0.0.0' 