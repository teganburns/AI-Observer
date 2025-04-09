import logging
from dataclasses import dataclass
from pathlib import Path

from flask import Flask
from utils.openai_client import OpenAIClient
from routes.lander import Lander, lander
from routes.special_routes import SpecialRoutes, special_routes
from routes.dashboard import Dashboard, dashboard

@dataclass
class Config:
    """Application configuration."""
    PORT: int = 5001
    LOG_FILE: Path = Path("./server_debug.log")

def create_app(config: Config) -> Flask:
    """Create and configure Flask application."""
    app = Flask(__name__)
    
    # Initialize clients and route handlers
    openai_client = OpenAIClient()
    lander_routes = Lander()
    special_routes_handler = SpecialRoutes(config, openai_client)
    dashboard_routes = Dashboard(config)

    # Register routes
    lander_routes.register_routes()
    special_routes_handler.register_routes()
    dashboard_routes.register_routes()

    # Register blueprints
    app.register_blueprint(lander)
    app.register_blueprint(special_routes)
    app.register_blueprint(dashboard)

    return app

def main() -> None:
    """Initialize and run the application."""
    # Initialize configuration
    config = Config()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler(str(config.LOG_FILE)),
            logging.StreamHandler()  # Add console output
        ]
    )

    # Create and run app
    app = create_app(config)
    logging.info(f"Starting server on port {config.PORT}")
    app.run(host='0.0.0.0', port=config.PORT, debug=True)

if __name__ == '__main__':
    main()