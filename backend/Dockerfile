# Pixie Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2 and ML libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create instance directory for any runtime data
RUN mkdir -p instance

# Set Flask app for CLI commands (flask db upgrade, etc.)
ENV FLASK_APP=app:create_app

# Expose the port
EXPOSE 35000

# Run with gunicorn for production
# Workers = 2 * CPU + 1, but for demo we use 2
CMD ["gunicorn", "--bind", "0.0.0.0:35000", "--workers", "2", "--timeout", "120", "app:create_app()"]
