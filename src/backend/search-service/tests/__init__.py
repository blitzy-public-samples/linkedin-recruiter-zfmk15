"""
Search Service Test Suite Configuration
=====================================

This module initializes the test configuration for the search service test suite.
It enables async/await test support via pytest-asyncio plugin to facilitate testing
of asynchronous operations in the search service.

Required Plugins:
    - pytest-asyncio v0.21.0: Provides async test support for pytest
    - pytest v7.0.0: Core testing framework

This configuration applies package-wide to all test modules in the search service
test suite, allowing test functions to be defined with async def.
"""

# Configure pytest to use the pytest-asyncio plugin for async test support
pytest_plugins = ["pytest_asyncio"]