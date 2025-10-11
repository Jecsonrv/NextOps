"""
Utility functions for NextOps project.
"""
import hashlib
import re
from datetime import datetime
from typing import Optional
from unidecode import unidecode


def calculate_file_hash(file_path: str) -> str:
    """
    Calculate SHA256 hash of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def calculate_content_hash(content: bytes) -> str:
    """
    Calculate SHA256 hash of content bytes.
    
    Args:
        content: Bytes content
        
    Returns:
        Hexadecimal hash string
    """
    return hashlib.sha256(content).hexdigest()


def normalize_text(text: str) -> str:
    """
    Normalize text by removing accents, converting to uppercase, and trimming.
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text
    """
    if not text:
        return ""
    # Remove accents
    text = unidecode(text)
    # Convert to uppercase and strip whitespace
    text = text.upper().strip()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text


def normalize_container_number(container: str) -> Optional[str]:
    """
    Normalize container number to standard format (4 letters + 7 digits).
    
    Args:
        container: Container number to normalize
        
    Returns:
        Normalized container number or None if invalid
    """
    if not container:
        return None
    
    # Remove whitespace and convert to uppercase
    container = container.strip().upper()
    
    # Match pattern: 4 letters + 7 digits
    pattern = r'^([A-Z]{4})[\s-]?(\d{7})$'
    match = re.match(pattern, container)
    
    if match:
        return f"{match.group(1)}{match.group(2)}"
    
    return None


def normalize_bl_number(bl: str) -> Optional[str]:
    """
    Normalize Bill of Lading number.
    
    Args:
        bl: BL number to normalize
        
    Returns:
        Normalized BL number
    """
    if not bl:
        return None
    
    # Remove whitespace and convert to uppercase
    bl = bl.strip().upper()
    # Remove common prefixes/suffixes
    bl = re.sub(r'^(BL|B/L|BILL)[\s:-]*', '', bl)
    
    return bl


def normalize_ot_number(ot: str) -> Optional[str]:
    """
    Normalize OT number to standard format (e.g., 25OT221).
    
    Args:
        ot: OT number to normalize
        
    Returns:
        Normalized OT number or None if invalid
    """
    if not ot:
        return None
    
    # Remove whitespace and convert to uppercase
    ot = ot.strip().upper()
    
    # Match pattern: 2 digits + OT + 3-4 digits
    pattern = r'^(\d{2})[\s-]?(OT)[\s-]?(\d{3,4})$'
    match = re.match(pattern, ot)
    
    if match:
        return f"{match.group(1)}OT{match.group(3)}"
    
    return None


def parse_date(date_string: str, formats: Optional[list] = None) -> Optional[datetime]:
    """
    Parse date string with multiple format attempts.
    
    Args:
        date_string: Date string to parse
        formats: List of date formats to try
        
    Returns:
        Datetime object or None if parsing fails
    """
    if not date_string:
        return None
    
    if formats is None:
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%d-%m-%Y',
            '%Y/%m/%d',
            '%d.%m.%Y',
            '%Y%m%d',
        ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    
    return None


def format_currency(amount: float, currency: str = 'USD') -> str:
    """
    Format amount as currency string.
    
    Args:
        amount: Amount to format
        currency: Currency code (default USD)
        
    Returns:
        Formatted currency string
    """
    if currency == 'USD':
        return f"${amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"


def truncate_text(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """
    Truncate text to max length with suffix.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix
