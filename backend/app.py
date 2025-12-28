from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify server is running"""
    return jsonify({
        'status': 'healthy',
        'message': 'Flask backend is running'
    })

# TODO: Add LLM endpoints here
# We will use lightLLM for the LLM calls
# Examples:
# - /api/chat - Handle chat interactions
# - /api/challenge - Create/manage challenges
# - /api/budget - Budget calculations and suggestions
# - /api/notification - Generate proactive notifications

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
