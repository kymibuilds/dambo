import random
import string

# Base62 character set: a-z, A-Z, 0-9
BASE62_CHARS = string.ascii_lowercase + string.ascii_uppercase + string.digits


def generate_short_id(length: int = 6) -> str:
    """Generate a random base62 string of given length."""
    return ''.join(random.choices(BASE62_CHARS, k=length))


def generate_unique_id(existing_ids: set[str], length: int = 6, max_attempts: int = 100) -> str:
    """Generate a unique ID that doesn't exist in the given set."""
    for _ in range(max_attempts):
        new_id = generate_short_id(length)
        if new_id not in existing_ids:
            return new_id
    raise RuntimeError("Failed to generate unique ID after max attempts")
