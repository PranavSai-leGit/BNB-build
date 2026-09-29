import sys
import os

# Set environment variable indicator for serverless
os.environ["VERCEL"] = "1"

# Resolve backend directory across different deployment layouts and working directories
base_dir = os.path.dirname(os.path.abspath(__file__))
possible_backend_dirs = [
    os.path.abspath(os.path.join(base_dir, "..", "backend")),
    os.path.abspath(os.path.join(base_dir, "backend")),
    os.path.abspath(os.path.join(base_dir, "..")),
    base_dir,
]

for b_dir in possible_backend_dirs:
    if os.path.exists(b_dir) and b_dir not in sys.path:
        sys.path.insert(0, b_dir)

try:
    from app.main import app
except ImportError:
    from backend.app.main import app
