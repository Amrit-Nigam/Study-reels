#!/bin/bash

# Install system dependencies for audio processing
echo "Installing system dependencies..."
apt-get update
apt-get install -y espeak espeak-data

# Install npm dependencies
echo "Installing npm dependencies..."
cd backend
npm install

echo "Build completed successfully!"
