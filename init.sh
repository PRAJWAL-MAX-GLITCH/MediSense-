#!/bin/bash
# Initialize Next.js project structure

cd frontend

# Create directory structure
mkdir -p src/app
mkdir -p src/components/{chat,sidebar,ui,input}
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/types
mkdir -p public

echo "Directory structure created"
echo "Now run: cd frontend && npm install"
