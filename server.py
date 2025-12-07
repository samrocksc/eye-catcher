#!/usr/bin/env python3
"""
TensorFlow.js Eye Tracking Server
Security-focused HTTP server that binds to localhost only
"""

import http.server
import os
import socketserver
import ssl
import sys

# Change to the directory containing our files
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080
HOST = "127.0.0.1"  # Explicitly bind to localhost only for security

# Try different ports if 8080 is taken
PORTS_TO_TRY = [8080, 8000, 3000, 5000]

Handler = http.server.SimpleHTTPRequestHandler

# Add MIME type for JavaScript modules
Handler.extensions_map.update(
    {
        ".js": "application/javascript",
    }
)

server = None
for port in PORTS_TO_TRY:
    try:
        # Explicitly bind to localhost only for security
        server = socketserver.TCPServer((HOST, port), Handler)
        PORT = port
        break
    except OSError as e:
        if e.errno == 98:  # Address already in use
