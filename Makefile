# Makefile for TensorFlow.js Eye Tracking Application

# Default target
.PHONY: help
help:
	@echo "TensorFlow.js Eye Tracking - Makefile Commands"
	@echo "=============================================="
	@echo "help        - Show this help message"
	@echo "install     - Install dependencies (if any)"
	@echo "start       - Start the development server (localhost only)"
	@echo "start-server - Start the custom Python server (localhost only)"
	@echo "stop        - Stop any running server processes"
	@echo "clean       - Clean up temporary files"
	@echo "docs        - View documentation"
	@echo "list        - List all project files"
	@echo "git-init    - Initialize git repository"

# Variables
PORT ?= 8080
PROJECT_DIR = $(shell pwd)
LOCALHOST = 127.0.0.1

# Install dependencies (if needed)
.PHONY: install
install:
	@echo "Checking dependencies..."
	# Check if required tools are available
	which python3 > /dev/null || (echo "Python3 is required but not found"; exit 1)
	@echo "Dependencies checked successfully."

# Start the development server (binds to localhost only for security)
.PHONY: start
start: stop install
	@echo "Starting TensorFlow.js Eye Tracking server on $(LOCALHOST):$(PORT)..."
	@echo "For security, server is bound to localhost only"
	@cd $(PROJECT_DIR) && python3 -m http.server $(PORT) --bind $(LOCALHOST)
	@echo "Server started at http://$(LOCALHOST):$(PORT)/"

# Alternative start method using our server script (also binds to localhost only)
.PHONY: start-server
start-server: stop install
	@echo "Starting TensorFlow.js Eye Tracking server on port $(PORT)..."
	@echo "For security, server is bound to localhost only"
	@cd $(PROJECT_DIR) && python3 server.py

# Stop any running server processes
.PHONY: stop
stop:
	@echo "Stopping any running server processes on port $(PORT)..."
	@lsof -i :$(PORT) | grep LISTEN | awk '{print $$2}' | xargs -r kill -9 || true
	@echo "Server processes stopped."

# Clean up temporary files
.PHONY: clean
clean:
	@echo "Cleaning up temporary files..."
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleanup completed."

# View documentation
.PHONY: docs
docs:
	@echo "Opening documentation..."
	@cat DOCUMENTATION.md

# List all project files
.PHONY: list
list:
	@echo "Project files:"
	@ls -la

# Initialize git repository
.PHONY: git-init
git-init:
	@if [ ! -d ".git" ]; then \
		echo "Initializing git repository..."; \
		git init; \
		git checkout -b main; \
		git add .; \
		git commit -m "Initial commit: Eye tracking application with TensorFlow.js and MediaPipe FaceMesh"; \
		echo "Git repository initialized."; \
	else \
		echo "Git repository already exists."; \
	fi



# Install and start in one command
.PHONY: run
run: install start

# View the main files
.PHONY: view
view:
	@echo "=== index.html ==="
	@head -20 index.html
	@echo "..."
	@echo ""
	@echo "=== script.js ==="
	@head -20 script.js
	@echo "..."
	@echo ""
	@echo "=== style.css ==="
	@head -20 style.css
	@echo "..."
