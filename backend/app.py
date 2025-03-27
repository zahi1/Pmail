from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.routes.auth import auth_bp
from backend.routes.jobs import jobs_bp  # Import the jobs routes blueprint
from backend.routes.messages import messages_bp
from backend.models.database import db
from backend.routes.profile import profile_bp
from backend.routes.dashboard import dashboard_bp

import os
import logging

app = Flask(__name__, static_folder="../frontend")  # Serves frontend files from Flask
app.secret_key = "ab39l0...someRandomSecret...0483y9"
CORS(app)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/pmail'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Set up logging
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(jobs_bp, url_prefix='')  # Jobs endpoints will be available as defined (e.g., /jobs)
app.register_blueprint(messages_bp, url_prefix='')
app.register_blueprint(profile_bp, url_prefix="/")
app.register_blueprint(dashboard_bp, url_prefix='/dashboard')


@app.route('/')
def home():
    logging.info('API is running!')
    return jsonify({"message": "Pmail API is running!"})

@app.route('/frontend/<path:filename>')
def serve_frontend(filename):
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
    logging.info(f'Serving frontend file: {filename}')
    return send_from_directory(frontend_dir, filename)

@app.route('/public/<path:filename>')
def serve_public(filename):
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../public'))
    logging.info(f'Serving public file: {filename}')
    return send_from_directory(public_dir, filename)

@app.errorhandler(404)
def page_not_found(e):
    logging.error(f'Page not found: {e}')
    return jsonify({"message": "Page not found"}), 404

@app.errorhandler(500)
def internal_server_error(e):
    logging.error(f'Internal server error: {e}')
    return jsonify({"message": "Internal server error"}), 500

if __name__ == '__main__':
    logging.info('Starting the application...')
    app.run(host='127.0.0.1', port=5000, debug=True)
