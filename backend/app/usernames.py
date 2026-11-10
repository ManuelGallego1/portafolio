"""Leaderboard username rules.

A username is 3-20 ASCII characters: letters and digits, optionally joined by
single '.', '_' or '-' separators (no leading, trailing or repeated separators).

Uniqueness is enforced on a normalized key (lowercase, separators removed),
so look-alike variants such as "Manuel.Dev", "manuel_dev" and "MANUELDEV"
all map to the same name.
"""

import re

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 20

_USERNAME_RE = re.compile(r"^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$")
_SEPARATORS_RE = re.compile(r"[._-]")

RESERVED_KEYS = frozenset(
    {
        "admin",
        "administrator",
        "administrador",
        "root",
        "system",
        "sistema",
        "moderator",
        "moderador",
        "mod",
        "staff",
        "support",
        "soporte",
        "server",
        "api",
        "null",
        "undefined",
        "anonymous",
        "anonimo",
        "manuelgallego",
        "alejandrogallego",
    }
)

# Basic filter for clearly offensive names. Substrings are chosen to avoid
# false positives in common words (e.g. "disputa", "computador").
_BLOCKED_SUBSTRINGS = (
    "hijueputa",
    "hijodeputa",
    "malparido",
    "gonorrea",
    "mierda",
    "pendejo",
    "fuck",
    "bitch",
    "nigger",
    "nigga",
    "cunt",
    "asshole",
    "hitler",
    "nazi",
)


class UsernameError(ValueError):
    """Raised when a username does not satisfy the leaderboard rules."""


def normalize_username_key(username: str) -> str:
    return _SEPARATORS_RE.sub("", username).lower()


def validate_username(raw: str) -> str:
    """Return the cleaned display name or raise ``UsernameError``."""
    username = raw.strip()
    if not USERNAME_MIN_LENGTH <= len(username) <= USERNAME_MAX_LENGTH:
        raise UsernameError(
            f"El nombre debe tener entre {USERNAME_MIN_LENGTH} y {USERNAME_MAX_LENGTH} caracteres."
        )
    if not _USERNAME_RE.fullmatch(username):
        raise UsernameError(
            "Usa solo letras, números y separadores simples (. _ -) entre ellos."
        )

    key = normalize_username_key(username)
    if len(key) < USERNAME_MIN_LENGTH:
        raise UsernameError("El nombre necesita al menos 3 letras o números.")
    if key in RESERVED_KEYS:
        raise UsernameError("Ese nombre está reservado.")
    if any(word in key for word in _BLOCKED_SUBSTRINGS):
        raise UsernameError("Ese nombre no está permitido.")
    return username
