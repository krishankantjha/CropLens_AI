"""
conftest.py — Global Pytest Configuration and Path Resolver for CropLens AI.
Ensures seamless imports across backend, tests, and evaluation modules from any execution directory.
"""

import os
import sys

# Insert workspace root directory into sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
