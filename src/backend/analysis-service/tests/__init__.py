"""
Test package initializer for the analysis service test suite.

This module configures pytest settings and enables async testing support for comprehensive
validation of AI analysis capabilities. It establishes the foundation for maintaining
90% candidate-role match accuracy through automated test suites.

Dependencies:
    pytest==7.0.0 - Primary testing framework
    pytest-asyncio==0.21.0 - Async/await test support
"""

# Configure pytest to use the asyncio plugin for async test support
pytest_plugins = ['pytest_asyncio']

# Global marker to enable async/await test support across all test modules
import pytest
pytestmark = pytest.mark.asyncio

# Note: This file intentionally contains minimal code as it serves primarily as a 
# test configuration entry point. The main test implementation logic resides in 
# individual test modules within this package.