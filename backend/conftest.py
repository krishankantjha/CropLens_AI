"""
backend/conftest.py — Pytest configuration for the backend module.
Ensures that the project root is in sys.path so 'backend.app...' imports work correctly.
"""

import os
import sys

# Insert the parent directory (project root) into sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
