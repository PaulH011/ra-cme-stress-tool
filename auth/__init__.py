"""
Authentication module for Parkview CMA Tool.

Provides user authentication, email verification, and session management.
"""

# Lazy imports to avoid pulling in streamlit when only database/models are needed
# (e.g., when used by the FastAPI backend)
from auth.database import init_db, get_session
from auth.models import User, Scenario, EmailVerificationToken


def __getattr__(name):
    """Lazy import for streamlit-dependent middleware."""
    if name in ('require_auth', 'get_current_user', 'logout'):
        from auth.middleware import require_auth, get_current_user, logout
        _lazy = {'require_auth': require_auth, 'get_current_user': get_current_user, 'logout': logout}
        return _lazy[name]
    raise AttributeError(f"module 'auth' has no attribute {name}")


__all__ = [
    'require_auth',
    'get_current_user',
    'logout',
    'init_db',
    'get_session',
    'User',
    'Scenario',
    'EmailVerificationToken',
]
