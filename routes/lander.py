from flask import Blueprint, render_template, Response

lander = Blueprint('lander', __name__, 
                  template_folder='templates',
                  static_folder='static')

class Lander:
    def __init__(self):
        pass

    def register_routes(self) -> None:
        """Register all routes with their handlers."""
        lander.add_url_rule('/', 'index', view_func=self.index)

    def index(self) -> Response:
        """Render the landing page."""
        return render_template('index.html') 