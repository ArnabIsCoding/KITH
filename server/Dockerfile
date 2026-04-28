# Use an official lightweight Python image
FROM python:3.11-slim

# Install system dependencies needed for grpcio
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Run the web service on container startup using gunicorn
# 1 worker and 8 threads is a good starting point for Cloud Run
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0", "server:app"]
