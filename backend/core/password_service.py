"""
Password Service for secure password handling and OTP generation.
Implements bcrypt hashing, complexity validation, and OTP management.
"""

import re
import secrets
import string
from typing import List
import bcrypt


class PasswordService:
    """Service for password hashing, validation, and OTP generation."""
    
    def __init__(self):
        self.cost_factor = 12  # bcrypt cost factor for security
        self.otp_length = 6
        self.min_password_length = 12
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with cost factor 12.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password string
        """
        # Convert password to bytes
        password_bytes = password.encode('utf-8')
        
        # Generate salt and hash
        salt = bcrypt.gensalt(rounds=self.cost_factor)
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        # Return as string
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            password: Plain text password to verify
            hashed: Hashed password to compare against
            
        Returns:
            True if password matches hash, False otherwise
        """
        try:
            password_bytes = password.encode('utf-8')
            hashed_bytes = hashed.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except (ValueError, TypeError):
            return False
    
    def validate_complexity(self, password: str) -> tuple[bool, List[str]]:
        """
        Validate password complexity requirements.
        
        Requirements:
        - Minimum 12 characters
        - At least one uppercase letter
        - At least one lowercase letter  
        - At least one number
        - At least one special character
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check minimum length
        if len(password) < self.min_password_length:
            errors.append(f"Password must be at least {self.min_password_length} characters long")
        
        # Check for uppercase letter
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        # Check for lowercase letter
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        # Check for number
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        # Check for special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")
        
        # Check for common patterns to avoid
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password cannot contain more than 2 consecutive identical characters")
        
        # Check for sequential characters
        if self._has_sequential_chars(password):
            errors.append("Password cannot contain sequential characters (e.g., 123, abc)")
        
        return len(errors) == 0, errors
    
    def _has_sequential_chars(self, password: str) -> bool:
        """
        Check if password contains sequential characters.
        
        Args:
            password: Password to check
            
        Returns:
            True if sequential characters found, False otherwise
        """
        password_lower = password.lower()
        
        # Check for sequential letters (3 or more)
        for i in range(len(password_lower) - 2):
            if (ord(password_lower[i+1]) == ord(password_lower[i]) + 1 and 
                ord(password_lower[i+2]) == ord(password_lower[i]) + 2):
                return True
        
        # Check for sequential numbers (3 or more)
        for i in range(len(password) - 2):
            if (password[i:i+3].isdigit() and 
                int(password[i+1]) == int(password[i]) + 1 and 
                int(password[i+2]) == int(password[i]) + 2):
                return True
        
        return False
    
    def generate_otp(self) -> str:
        """
        Generate a secure 6-digit OTP.
        
        Returns:
            6-digit OTP string
        """
        # Use secrets for cryptographically secure random generation
        return ''.join(secrets.choice(string.digits) for _ in range(self.otp_length))
    
    def validate_otp_format(self, otp: str) -> bool:
        """
        Validate OTP format (6 digits).
        
        Args:
            otp: OTP string to validate
            
        Returns:
            True if valid format, False otherwise
        """
        return bool(re.match(r'^\d{6}$', otp))
    
    def generate_secure_token(self, length: int = 32) -> str:
        """
        Generate a secure random token for various purposes.
        
        Args:
            length: Length of the token to generate
            
        Returns:
            Secure random token string
        """
        return secrets.token_urlsafe(length)
    
    def is_common_password(self, password: str) -> bool:
        """
        Check if password is in common password list.
        
        Args:
            password: Password to check
            
        Returns:
            True if password is common, False otherwise
        """
        # Common passwords to reject
        common_passwords = {
            'password', 'password123', '123456', '123456789', 'qwerty',
            'abc123', 'password1', 'admin', 'administrator', 'root',
            'user', 'guest', 'test', 'demo', 'welcome', 'login',
            '12345678', '1234567890', 'qwerty123', 'letmein',
            'monkey', 'dragon', 'master', 'shadow', 'superman'
        }
        
        return password.lower() in common_passwords
    
    def get_password_strength_score(self, password: str) -> tuple[int, str]:
        """
        Calculate password strength score and description.
        
        Args:
            password: Password to evaluate
            
        Returns:
            Tuple of (score_0_to_100, strength_description)
        """
        score = 0
        
        # Length scoring
        if len(password) >= 8:
            score += 10
        if len(password) >= 12:
            score += 15
        if len(password) >= 16:
            score += 10
        
        # Character variety scoring
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 15
        
        # Complexity bonuses
        if len(set(password)) > len(password) * 0.7:  # Character diversity
            score += 10
        if not self._has_sequential_chars(password):
            score += 10
        if not self.is_common_password(password):
            score += 10
        
        # Determine strength description
        if score >= 80:
            strength = "Very Strong"
        elif score >= 60:
            strength = "Strong"
        elif score >= 40:
            strength = "Moderate"
        elif score >= 20:
            strength = "Weak"
        else:
            strength = "Very Weak"
        
        return min(score, 100), strength


# Global instance
password_service = PasswordService()