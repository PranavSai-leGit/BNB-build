import sys
import os

# Add backend directory to sys.path so app.* modules are resolved seamlessly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set environment variable indicator for serverless
os.environ["VERCEL"] = "1"

from app.main import app
