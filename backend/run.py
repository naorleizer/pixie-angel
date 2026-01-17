from app import create_app, db
from app.models.user import User

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}

if __name__ == '__main__':
    import os
    import socket

    port = int(os.environ.get('PORT', 35000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    try:
        app.run(debug=debug, host=host, port=port)
    except OSError as e:
        # Common on Windows when port is in use or blocked by permissions
        print(f"Failed to start server on {host}:{port}: {e}")
        print("Possible causes: port already in use, firewall or permission issues.")
        print("Try running on a different port: set the PORT environment variable, e.g. `set PORT=5001` on Windows.")
        raise
