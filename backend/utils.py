"""
Utility functions for server-side logging and security.

This module provides functions for logging user activities and security events
that can be called from anywhere in the codebase.
"""

from typing import Any, Dict, Optional
from .db import get_session_factory, UserActivityLog
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


def log_server_activity(
    user_id: Optional[int],
    action: str,
    target: str,
    meta: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> bool:
    """
    Log a server-side activity to the database for security and audit purposes.
    
    Call this function from any part of the Python codebase to record activities.
    
    Args:
        user_id: The ID of the user performing the action (None for system/anonymous)
        action: Type of action (e.g., 'system_event', 'purchase', 'login_attempt', 'security_alert')
        target: What was targeted (e.g., 'payment_success', 'login_page', 'api_endpoint')
        meta: Additional metadata as a dictionary (e.g., {'amount': 500, 'reason': 'suspicious'})
        ip_address: Optional IP address if available from request context
    
    Returns:
        True if logging succeeded, False otherwise
    
    Examples:
        # Log a successful purchase
        log_server_activity(user.id, 'purchase', 'premium_package', {'amount': 500})
        
        # Log a security alert (e.g., suspicious upload)
        log_server_activity(user.id, 'security_alert', 'file_upload', 
                           {'filename': 'suspicious.exe', 'blocked': True})
        
        # Log a system event
        log_server_activity(None, 'system_event', 'database_backup', {'status': 'success'})
    """
    try:
        session_factory = get_session_factory()
        session = session_factory()
        
        try:
            log_entry = UserActivityLog(
                user_id=user_id,
                action_type=action,
                target_element=target,
                page_url='SERVER_SIDE',
                meta_data=meta or {},
                ip_address=ip_address
            )
            session.add(log_entry)
            session.commit()
            logger.info(f"Activity logged: [{action}] {target} for user {user_id}")
            return True
        except SQLAlchemyError as db_err:
            session.rollback()
            logger.error(f"Database error logging activity: {db_err}")
            return False
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Failed to log server activity: {e}")
        return False


def log_security_event(
    user_id: Optional[int],
    event_type: str,
    details: Dict[str, Any],
    ip_address: Optional[str] = None,
    severity: str = 'info'
) -> bool:
    """
    Log a security-related event for threat monitoring and compliance.
    
    Args:
        user_id: The ID of the user (None for anonymous/system)
        event_type: Type of security event (e.g., 'login_failed', 'virus_detected', 'brute_force')
        details: Detailed information about the event
        ip_address: IP address associated with the event
        severity: Event severity level ('info', 'warning', 'critical')
    
    Returns:
        True if logging succeeded, False otherwise
    
    Examples:
        # Log a failed login attempt
        log_security_event(None, 'login_failed', 
                          {'username': 'admin', 'attempt': 5}, 
                          ip_address='192.168.1.1', severity='warning')
        
        # Log a virus/malware detection
        log_security_event(user.id, 'malware_detected',
                          {'filename': 'virus.exe', 'type': 'trojan', 'action': 'blocked'},
                          ip_address=request_ip, severity='critical')
        
        # Log suspicious API usage
        log_security_event(user.id, 'rate_limit_exceeded',
                          {'endpoint': '/api/messages', 'count': 1000},
                          severity='warning')
    """
    meta = {
        'severity': severity,
        'event_type': event_type,
        **details
    }
    return log_server_activity(
        user_id=user_id,
        action=f'security_{severity}',
        target=event_type,
        meta=meta,
        ip_address=ip_address
    )


def log_request_activity(
    request,
    user_id: Optional[int],
    action: str,
    target: str,
    meta: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log an activity with automatic IP extraction from Flask request object.
    
    Args:
        request: Flask request object
        user_id: The ID of the user
        action: Type of action
        target: What was targeted
        meta: Additional metadata
    
    Returns:
        True if logging succeeded, False otherwise
    """
    # Extract IP from request
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip_address and ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()
    
    return log_server_activity(
        user_id=user_id,
        action=action,
        target=target,
        meta=meta,
        ip_address=ip_address
    )
