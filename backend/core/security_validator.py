import re
import html
from typing import Optional, List, Tuple, Dict, Any
from urllib.parse import urlparse
import ipaddress


class SecurityValidator:
    """
    Security validation and sanitization service.
    Provides input validation, sanitization, and security checks.
    """
    
    # Common malicious patterns
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>.*?</embed>',
        r'<link[^>]*>',
        r'<meta[^>]*>',
        r'<style[^>]*>.*?</style>',
    ]
    
    SQL_INJECTION_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
        r'(\b(OR|AND)\s+\d+\s*=\s*\d+)',
        r'(\b(OR|AND)\s+[\'"][^\'"]*[\'"])',
        r'(--|#|/\*|\*/)',
        r'(\bUNION\b.*\bSELECT\b)',
        r'(\bINTO\s+OUTFILE\b)',
    ]
    
    # Allowed characters for different input types
    ALPHANUMERIC_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]{3,30}$')
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """
        Sanitize HTML content by escaping dangerous characters.
        
        Args:
            text: Input text to sanitize
            
        Returns:
            Sanitized text with HTML entities escaped
        """
        if not text:
            return ""
        
        # HTML escape
        sanitized = html.escape(text, quote=True)
        
        # Remove any remaining script tags or dangerous patterns
        for pattern in SecurityValidator.XSS_PATTERNS:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        return sanitized.strip()
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """
        Validate email address format and security.
        
        Args:
            email: Email address to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not email:
            return False, "Email is required"
        
        email = email.strip().lower()
        
        # Length check
        if len(email) > 254:
            return False, "Email address is too long"
        
        # Basic format validation
        if not SecurityValidator.EMAIL_PATTERN.match(email):
            return False, "Invalid email format"
        
        # Check for suspicious patterns
        if SecurityValidator._contains_malicious_patterns(email):
            return False, "Email contains invalid characters"
        
        # Domain validation
        try:
            local, domain = email.rsplit('@', 1)
            if len(local) > 64 or len(domain) > 253:
                return False, "Email address format is invalid"
            
            # Check for consecutive dots
            if '..' in email:
                return False, "Email address format is invalid"
                
        except ValueError:
            return False, "Invalid email format"
        
        return True, None
    
    @staticmethod
    def validate_username(username: str) -> Tuple[bool, Optional[str]]:
        """
        Validate username format and security.
        
        Args:
            username: Username to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not username:
            return False, "Username is required"
        
        username = username.strip()
        
        # Length check
        if len(username) < 3:
            return False, "Username must be at least 3 characters long"
        if len(username) > 30:
            return False, "Username must be no more than 30 characters long"
        
        # Pattern validation
        if not SecurityValidator.USERNAME_PATTERN.match(username):
            return False, "Username can only contain letters, numbers, dots, underscores, and hyphens"
        
        # Check for suspicious patterns
        if SecurityValidator._contains_malicious_patterns(username):
            return False, "Username contains invalid characters"
        
        # Reserved usernames
        reserved = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp', 'test', 'guest']
        if username.lower() in reserved:
            return False, "Username is reserved"
        
        return True, None
    
    @staticmethod
    def validate_name(name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate display name.
        
        Args:
            name: Display name to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not name:
            return True, None  # Name is optional
        
        name = name.strip()
        
        # Length check
        if len(name) > 100:
            return False, "Name must be no more than 100 characters long"
        
        # Check for malicious patterns
        if SecurityValidator._contains_malicious_patterns(name):
            return False, "Name contains invalid characters"
        
        # Basic character validation (allow unicode letters, spaces, common punctuation)
        if not re.match(r'^[\w\s\-\.\,\'\"]+$', name, re.UNICODE):
            return False, "Name contains invalid characters"
        
        return True, None
    
    @staticmethod
    def validate_url(url: str) -> Tuple[bool, Optional[str]]:
        """
        Validate URL format and security.
        
        Args:
            url: URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not url:
            return False, "URL is required"
        
        url = url.strip()
        
        # Length check
        if len(url) > 2048:
            return False, "URL is too long"
        
        try:
            parsed = urlparse(url)
            
            # Scheme validation
            if parsed.scheme not in ['http', 'https']:
                return False, "URL must use HTTP or HTTPS protocol"
            
            # Host validation
            if not parsed.netloc:
                return False, "URL must have a valid host"
            
            # Check for suspicious patterns
            if SecurityValidator._contains_malicious_patterns(url):
                return False, "URL contains invalid characters"
            
            # Prevent local/private network access
            try:
                # Extract hostname (remove port if present)
                hostname = parsed.hostname
                if hostname:
                    ip = ipaddress.ip_address(hostname)
                    if ip.is_private or ip.is_loopback or ip.is_link_local:
                        return False, "URL cannot point to private or local addresses"
            except (ValueError, ipaddress.AddressValueError):
                # Not an IP address, which is fine
                pass
            
        except Exception:
            return False, "Invalid URL format"
        
        return True, None
    
    @staticmethod
    def validate_json_field(data: Any, max_size: int = 10000) -> Tuple[bool, Optional[str]]:
        """
        Validate JSON field data.
        
        Args:
            data: JSON data to validate
            max_size: Maximum size in characters when serialized
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if data is None:
            return True, None
        
        try:
            import json
            serialized = json.dumps(data)
            
            if len(serialized) > max_size:
                return False, f"JSON data is too large (max {max_size} characters)"
            
            # Check for suspicious patterns in serialized JSON
            if SecurityValidator._contains_malicious_patterns(serialized):
                return False, "JSON data contains invalid content"
            
        except (TypeError, ValueError) as e:
            return False, f"Invalid JSON data: {str(e)}"
        
        return True, None
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename for safe storage.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        if not filename:
            return "unnamed"
        
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', filename)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
            max_name_len = 255 - len(ext) - 1 if ext else 255
            sanitized = name[:max_name_len] + ('.' + ext if ext else '')
        
        # Ensure not empty
        if not sanitized:
            sanitized = "unnamed"
        
        return sanitized
    
    @staticmethod
    def validate_ip_address(ip_str: str) -> Tuple[bool, Optional[str]]:
        """
        Validate IP address format.
        
        Args:
            ip_str: IP address string
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not ip_str:
            return False, "IP address is required"
        
        try:
            ip = ipaddress.ip_address(ip_str.strip())
            return True, None
        except ValueError:
            return False, "Invalid IP address format"
    
    @staticmethod
    def _contains_malicious_patterns(text: str) -> bool:
        """
        Check if text contains malicious patterns.
        
        Args:
            text: Text to check
            
        Returns:
            True if malicious patterns found
        """
        if not text:
            return False
        
        text_lower = text.lower()
        
        # Check for XSS patterns
        for pattern in SecurityValidator.XSS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE | re.DOTALL):
                return True
        
        # Check for SQL injection patterns
        for pattern in SecurityValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        # Check for null bytes and control characters
        if '\x00' in text or any(ord(c) < 32 and c not in '\t\n\r' for c in text):
            return True
        
        return False
    
    @staticmethod
    def validate_request_size(content_length: Optional[int], max_size: int = 10 * 1024 * 1024) -> Tuple[bool, Optional[str]]:
        """
        Validate request content size.
        
        Args:
            content_length: Content length in bytes
            max_size: Maximum allowed size in bytes (default 10MB)
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if content_length is None:
            return True, None
        
        if content_length > max_size:
            return False, f"Request too large (max {max_size // (1024*1024)}MB)"
        
        return True, None
    
    @staticmethod
    def get_safe_headers(headers: Dict[str, str]) -> Dict[str, str]:
        """
        Extract safe headers for logging.
        
        Args:
            headers: Request headers
            
        Returns:
            Dictionary of safe headers
        """
        safe_headers = {}
        allowed_headers = [
            'user-agent', 'accept', 'accept-language', 'accept-encoding',
            'content-type', 'content-length', 'host', 'referer'
        ]
        
        for key, value in headers.items():
            key_lower = key.lower()
            if key_lower in allowed_headers:
                # Sanitize header value
                safe_value = SecurityValidator.sanitize_html(str(value)[:500])  # Limit length
                safe_headers[key_lower] = safe_value
        
        return safe_headers


# Global security validator instance
security_validator = SecurityValidator()