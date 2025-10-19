"""
Two-Factor Authentication Service using TOTP (Time-based One-Time Password).
Handles TOTP generation, QR code creation, and backup code management.
"""

import base64
import hashlib
import io
import json
import secrets
import string
from typing import List, Optional, Tuple
import pyotp
import qrcode
from qrcode.image.pil import PilImage
from core.config import settings
from core.password_service import password_service


class TwoFactorService:
    """Service for 2FA TOTP generation, verification, and backup code management."""
    
    def __init__(self):
        self.app_name = settings.app_name
        self.backup_codes_count = 10
        self.backup_code_length = 8
        self.totp_window = 1  # Allow 1 window before/after current time
    
    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret for a user.
        
        Returns:
            Base32-encoded secret string
        """
        return pyotp.random_base32()
    
    def generate_qr_code(self, email: str, secret: str) -> str:
        """
        Generate QR code for TOTP setup.
        
        Args:
            email: User's email address
            secret: TOTP secret
            
        Returns:
            Base64-encoded PNG image of QR code
        """
        # Create TOTP URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=email,
            issuer_name=self.app_name
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white", image_factory=PilImage)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_totp(self, secret: str, token: str, window: Optional[int] = None) -> bool:
        """
        Verify a TOTP token against the secret.
        
        Args:
            secret: User's TOTP secret
            token: 6-digit TOTP token to verify
            window: Time window for verification (defaults to class setting)
            
        Returns:
            True if token is valid, False otherwise
        """
        if not token or len(token) != 6 or not token.isdigit():
            return False
        
        try:
            totp = pyotp.TOTP(secret)
            verification_window = window if window is not None else self.totp_window
            return totp.verify(token, valid_window=verification_window)
        except Exception:
            return False
    
    def get_current_totp(self, secret: str) -> str:
        """
        Get the current TOTP token for a secret (for testing purposes).
        
        Args:
            secret: TOTP secret
            
        Returns:
            Current 6-digit TOTP token
        """
        totp = pyotp.TOTP(secret)
        return totp.now()
    
    def generate_backup_codes(self) -> List[str]:
        """
        Generate backup codes for 2FA recovery.
        
        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(self.backup_codes_count):
            # Generate alphanumeric code
            code = ''.join(
                secrets.choice(string.ascii_uppercase + string.digits) 
                for _ in range(self.backup_code_length)
            )
            codes.append(code)
        
        return codes
    
    def hash_backup_codes(self, codes: List[str]) -> str:
        """
        Hash backup codes for secure storage.
        
        Args:
            codes: List of backup codes to hash
            
        Returns:
            JSON string of hashed codes
        """
        hashed_codes = []
        for code in codes:
            # Use SHA-256 with salt for backup codes
            salt = secrets.token_hex(16)
            code_hash = hashlib.sha256((code + salt).encode()).hexdigest()
            hashed_codes.append({
                'hash': code_hash,
                'salt': salt,
                'used': False
            })
        
        return json.dumps(hashed_codes)
    
    def verify_backup_code(self, stored_codes_json: str, provided_code: str) -> Tuple[bool, str]:
        """
        Verify a backup code and mark it as used.
        
        Args:
            stored_codes_json: JSON string of stored hashed backup codes
            provided_code: Backup code provided by user
            
        Returns:
            Tuple of (is_valid, updated_codes_json)
        """
        try:
            stored_codes = json.loads(stored_codes_json)
        except (json.JSONDecodeError, TypeError):
            return False, stored_codes_json
        
        provided_code = provided_code.upper().strip()
        
        for code_data in stored_codes:
            if code_data.get('used', False):
                continue
            
            # Verify the code
            salt = code_data.get('salt', '')
            stored_hash = code_data.get('hash', '')
            provided_hash = hashlib.sha256((provided_code + salt).encode()).hexdigest()
            
            if provided_hash == stored_hash:
                # Mark as used
                code_data['used'] = True
                return True, json.dumps(stored_codes)
        
        return False, stored_codes_json
    
    def get_unused_backup_codes_count(self, stored_codes_json: str) -> int:
        """
        Get the count of unused backup codes.
        
        Args:
            stored_codes_json: JSON string of stored backup codes
            
        Returns:
            Number of unused backup codes
        """
        try:
            stored_codes = json.loads(stored_codes_json)
            return sum(1 for code in stored_codes if not code.get('used', False))
        except (json.JSONDecodeError, TypeError):
            return 0
    
    def regenerate_backup_codes(self) -> Tuple[List[str], str]:
        """
        Generate new backup codes and return both plain and hashed versions.
        
        Returns:
            Tuple of (plain_codes_list, hashed_codes_json)
        """
        plain_codes = self.generate_backup_codes()
        hashed_codes = self.hash_backup_codes(plain_codes)
        return plain_codes, hashed_codes
    
    def validate_secret(self, secret: str) -> bool:
        """
        Validate if a TOTP secret is properly formatted.
        
        Args:
            secret: TOTP secret to validate
            
        Returns:
            True if secret is valid, False otherwise
        """
        try:
            # Check if secret is base32 encoded and reasonable length
            if not secret or len(secret) < 16:
                return False
            
            # Try to decode as base32
            import base64
            base64.b32decode(secret)
            
            # Try to create TOTP instance and generate a token
            totp = pyotp.TOTP(secret)
            token = totp.now()
            
            # Verify the generated token is 6 digits
            return len(token) == 6 and token.isdigit()
        except Exception:
            return False
    
    def get_totp_uri(self, email: str, secret: str) -> str:
        """
        Get the TOTP provisioning URI for manual entry.
        
        Args:
            email: User's email address
            secret: TOTP secret
            
        Returns:
            TOTP provisioning URI
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=self.app_name
        )
    
    def format_backup_codes_for_display(self, codes: List[str]) -> List[str]:
        """
        Format backup codes for user-friendly display.
        
        Args:
            codes: List of backup codes
            
        Returns:
            List of formatted backup codes (with dashes for readability)
        """
        formatted_codes = []
        for code in codes:
            # Add dash in the middle for readability (e.g., ABCD-1234)
            if len(code) == 8:
                formatted = f"{code[:4]}-{code[4:]}"
            else:
                formatted = code
            formatted_codes.append(formatted)
        
        return formatted_codes
    
    def normalize_backup_code_input(self, code: str) -> str:
        """
        Normalize backup code input by removing spaces and dashes.
        
        Args:
            code: Raw backup code input from user
            
        Returns:
            Normalized backup code
        """
        return code.upper().replace('-', '').replace(' ', '').strip()


# Global instance
two_factor_service = TwoFactorService()