from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import threading
from dataclasses import dataclass

from core.config import settings


@dataclass
class RateLimitRule:
    """Rate limit rule configuration"""
    max_attempts: int
    window_minutes: int
    lockout_minutes: int = 0


@dataclass
class AttemptRecord:
    """Record of attempts for rate limiting"""
    count: int
    window_start: datetime
    locked_until: Optional[datetime] = None


class RateLimiter:
    """
    In-memory rate limiter for authentication and security endpoints.
    Tracks attempts by IP address and user email.
    """
    
    def __init__(self):
        self._ip_attempts: Dict[str, Dict[str, AttemptRecord]] = defaultdict(lambda: defaultdict(lambda: AttemptRecord(0, datetime.now(timezone.utc))))
        self._email_attempts: Dict[str, Dict[str, AttemptRecord]] = defaultdict(lambda: defaultdict(lambda: AttemptRecord(0, datetime.now(timezone.utc))))
        self._lock = threading.Lock()
        
        # Rate limit rules for different endpoints
        self.rules = {
            "login": RateLimitRule(max_attempts=5, window_minutes=15, lockout_minutes=15),
            "password_reset": RateLimitRule(max_attempts=3, window_minutes=60, lockout_minutes=0),
            "otp_request": RateLimitRule(max_attempts=5, window_minutes=60, lockout_minutes=0),
            "bootstrap": RateLimitRule(max_attempts=3, window_minutes=60, lockout_minutes=30),
            "invitation": RateLimitRule(max_attempts=10, window_minutes=60, lockout_minutes=0),
        }
    
    def check_rate_limit(
        self,
        endpoint: str,
        ip_address: Optional[str] = None,
        email: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if request is within rate limits.
        
        Args:
            endpoint: Endpoint name (login, password_reset, etc.)
            ip_address: Client IP address
            email: User email (optional)
            
        Returns:
            Tuple of (allowed, reason, retry_after_seconds)
        """
        if endpoint not in self.rules:
            return True, None, None
        
        rule = self.rules[endpoint]
        current_time = datetime.now(timezone.utc)
        
        with self._lock:
            # Check IP-based rate limiting
            if ip_address:
                ip_blocked, ip_reason, ip_retry = self._check_limit(
                    self._ip_attempts[ip_address], endpoint, rule, current_time
                )
                if not ip_blocked:
                    return False, ip_reason, ip_retry
            
            # Check email-based rate limiting
            if email:
                email_blocked, email_reason, email_retry = self._check_limit(
                    self._email_attempts[email], endpoint, rule, current_time
                )
                if not email_blocked:
                    return False, email_reason, email_retry
        
        return True, None, None
    
    def record_attempt(
        self,
        endpoint: str,
        success: bool,
        ip_address: Optional[str] = None,
        email: Optional[str] = None
    ):
        """
        Record an attempt for rate limiting.
        
        Args:
            endpoint: Endpoint name
            success: Whether the attempt was successful
            ip_address: Client IP address
            email: User email (optional)
        """
        if endpoint not in self.rules:
            return
        
        rule = self.rules[endpoint]
        current_time = datetime.now(timezone.utc)
        
        with self._lock:
            # Record IP attempt
            if ip_address:
                self._record_attempt(
                    self._ip_attempts[ip_address], endpoint, rule, current_time, success
                )
            
            # Record email attempt
            if email:
                self._record_attempt(
                    self._email_attempts[email], endpoint, rule, current_time, success
                )
    
    def _check_limit(
        self,
        attempts: Dict[str, AttemptRecord],
        endpoint: str,
        rule: RateLimitRule,
        current_time: datetime
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """Check if attempts are within limits"""
        record = attempts[endpoint]
        
        # Check if currently locked out
        if record.locked_until and current_time < record.locked_until:
            retry_after = int((record.locked_until - current_time).total_seconds())
            return False, f"Rate limit exceeded for {endpoint}. Try again later.", retry_after
        
        # Reset window if expired
        window_end = record.window_start + timedelta(minutes=rule.window_minutes)
        if current_time > window_end:
            record.count = 0
            record.window_start = current_time
            record.locked_until = None
        
        # Check if within limits
        if record.count >= rule.max_attempts:
            if rule.lockout_minutes > 0:
                record.locked_until = current_time + timedelta(minutes=rule.lockout_minutes)
                retry_after = rule.lockout_minutes * 60
                return False, f"Rate limit exceeded for {endpoint}. Account locked.", retry_after
            else:
                retry_after = int((window_end - current_time).total_seconds())
                return False, f"Rate limit exceeded for {endpoint}. Try again later.", retry_after
        
        return True, None, None
    
    def _record_attempt(
        self,
        attempts: Dict[str, AttemptRecord],
        endpoint: str,
        rule: RateLimitRule,
        current_time: datetime,
        success: bool
    ):
        """Record an attempt"""
        record = attempts[endpoint]
        
        # Reset window if expired
        window_end = record.window_start + timedelta(minutes=rule.window_minutes)
        if current_time > window_end:
            record.count = 0
            record.window_start = current_time
            record.locked_until = None
        
        # Only count failed attempts for most endpoints
        # For some endpoints like OTP requests, count all attempts
        if not success or endpoint in ["otp_request", "invitation"]:
            record.count += 1
        
        # Reset on successful login
        if success and endpoint == "login":
            record.count = 0
            record.locked_until = None
    
    def get_attempt_info(
        self,
        endpoint: str,
        ip_address: Optional[str] = None,
        email: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Get current attempt information for debugging/monitoring.
        
        Args:
            endpoint: Endpoint name
            ip_address: Client IP address
            email: User email
            
        Returns:
            Dictionary with attempt information
        """
        if endpoint not in self.rules:
            return {}
        
        rule = self.rules[endpoint]
        current_time = datetime.now(timezone.utc)
        info = {}
        
        with self._lock:
            if ip_address and ip_address in self._ip_attempts:
                record = self._ip_attempts[ip_address][endpoint]
                info["ip"] = {
                    "attempts": record.count,
                    "max_attempts": rule.max_attempts,
                    "window_start": record.window_start.isoformat(),
                    "locked_until": record.locked_until.isoformat() if record.locked_until else None,
                    "is_locked": record.locked_until and current_time < record.locked_until
                }
            
            if email and email in self._email_attempts:
                record = self._email_attempts[email][endpoint]
                info["email"] = {
                    "attempts": record.count,
                    "max_attempts": rule.max_attempts,
                    "window_start": record.window_start.isoformat(),
                    "locked_until": record.locked_until.isoformat() if record.locked_until else None,
                    "is_locked": record.locked_until and current_time < record.locked_until
                }
        
        return info
    
    def clear_attempts(
        self,
        endpoint: Optional[str] = None,
        ip_address: Optional[str] = None,
        email: Optional[str] = None
    ):
        """
        Clear rate limit attempts (for admin use).
        
        Args:
            endpoint: Specific endpoint to clear (None for all)
            ip_address: Specific IP to clear (None for all)
            email: Specific email to clear (None for all)
        """
        with self._lock:
            if ip_address:
                if endpoint:
                    if ip_address in self._ip_attempts:
                        self._ip_attempts[ip_address][endpoint] = AttemptRecord(0, datetime.now(timezone.utc))
                else:
                    if ip_address in self._ip_attempts:
                        del self._ip_attempts[ip_address]
            
            if email:
                if endpoint:
                    if email in self._email_attempts:
                        self._email_attempts[email][endpoint] = AttemptRecord(0, datetime.now(timezone.utc))
                else:
                    if email in self._email_attempts:
                        del self._email_attempts[email]
            
            # Clear all if no specific targets
            if not ip_address and not email:
                if endpoint:
                    for ip_dict in self._ip_attempts.values():
                        ip_dict[endpoint] = AttemptRecord(0, datetime.now(timezone.utc))
                    for email_dict in self._email_attempts.values():
                        email_dict[endpoint] = AttemptRecord(0, datetime.now(timezone.utc))
                else:
                    self._ip_attempts.clear()
                    self._email_attempts.clear()


# Global rate limiter instance
rate_limiter = RateLimiter()