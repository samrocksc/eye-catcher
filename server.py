#!/usr/bin/env python3
import http.server
import os
import socketserver
import ssl
import sys

# Change to the directory containing our files
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080

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
        server = socketserver.TCPServer(("localhost", port), Handler)
        PORT = port
        break
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Port {port} is in use, trying another port...")
            continue
        else:
            raise e

if server is None:
    print("Could not find an available port. Tried:", PORTS_TO_TRY)
    sys.exit(1)

# Try to create SSL context for HTTPS
# First, check if we have a self-signed certificate
cert_file = "cert.pem"
key_file = "key.pem"

if os.path.exists(cert_file) and os.path.exists(key_file):
    try:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        protocol = "HTTPS"
    except Exception as e:
        print(f"Warning: Could not load SSL certificate: {e}")
        print("Running on HTTP instead. Camera access may be limited.")
        protocol = "HTTP"
else:
    print("No SSL certificate found. Running on HTTP.")
    print("To use HTTPS, generate a certificate with:")
    print(
        "  openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365"
    )
    protocol = "HTTP"

print(f"TensorFlow.js Eye Tracking server running at {protocol}://localhost:{PORT}/")
print("Press Ctrl+C to stop the server")

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
finally:
    server.server_close()
