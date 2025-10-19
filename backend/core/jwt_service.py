"""
JWT Service for token management and validation.
Handles session tokens, temporary tokens, and reset tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from jose import JWTError, jwt
from core.config import settings


class JWTService:
    """Service for JWT token creation, validation, and management."""
    
    def __init__(self):
        self.secret_key = settings.jwt_secret or settings.secret_key
        self.algorithm = settings.algorithm
        self.default_expiry = settings.jwt_expiry
    
    def create_token(self, user_data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT token for user session.
        
        Args:
            user_data: Dictionary containing user information (id, email, role, etc.)
            expires_delta: Optional custom expiration time
            
        Returns:
            Encoded JWT token string
        """
        to_encode = user_data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(seconds=self.default_expiry)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "session"
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string to verify
            
        Returns:
            Decoded token payload
            
        Raises:
            JWTError: If token is invalid, expired, or malformed
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token has expired
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                raise JWTError("Token has expired")
            
            return payload
            
        except JWTError as e:
            raise JWTError(f"Token validation failed: {str(e)}")
    
    def create_temp_token(self, user_data: Dict[str, Any], expires_minutes: int = 15) -> str:
        """
        Create a temporary JWT token for short-lived operations (bootstrap, password reset).
        
        Args:
            user_data: Dictionary containing user information
            expires_minutes: Token expiration time in minutes
            
        Returns:
            Encoded temporary JWT token string
        """
        to_encode = user_data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "temporary"
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_temp_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a temporary token.
        
        Args:
            token: Temporary JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            JWTError: If token is invalid, expired, or not a temporary token
        """
        payload = self.verify_token(token)
        
        # Verify this is a temporary token
        if payload.get("type") != "temporary":
            raise JWTError("Invalid token type")
        
        return payload
    
    def create_reset_token(self, user_data: Dict[str, Any], expires_minutes: int = 30) -> str:
        """
        Create a password reset token.
        
        Args:
            user_data: Dictionary containing user information
            expires_minutes: Token expiration time in minutes
            
        Returns:
            Encoded reset JWT token string
        """
        to_encode = user_data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "reset"
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_reset_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a password reset token.
        
        Args:
            token: Reset JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            JWTError: If token is invalid, expired, or not a reset token
        """
        payload = self.verify_token(token)
        
        # Verify this is a reset token
        if payload.get("type") != "reset":
            raise JWTError("Invalid token type")
        
        return payload
    
    def get_token_type(self, token: str) -> str:
        """
        Get the type of a JWT token without full validation.
        
        Args:
            token: JWT token string
            
        Returns:
            Token type string
        """
        try:
            # Decode without verification to get type
            unverified_payload = jwt.get_unverified_claims(token)
            return unverified_payload.get("type", "unknown")
        except JWTError:
            return "invalid"
    
    def is_token_expired(self, token: str) -> bool:
        """
        Check if a token is expired without raising an exception.
        
        Args:
            token: JWT token string
            
        Returns:
            True if token is expired, False otherwise
        """
        try:
            payload = jwt.get_unverified_claims(token)
            exp = payload.get("exp")
            if exp:
                return datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc)
            return True
        except JWTError:
            return True


# Global instance
jwt_service = JWTService()