# Recognizes concise comments across common source languages.
# Keeps prose validation independent from structural checks.

from __future__ import annotations

from pathlib import Path
from typing import Iterator, Sequence

from .models import Finding
from .settings import (
    CLOSING_COMMENT_PATTERN,
    DASH_COMMENT_SUFFIXES,
    HASH_COMMENT_SUFFIXES,
    OPENING_COMMENT_PATTERN,
    SLASH_COMMENT_SUFFIXES,
    WORD_PATTERN,
)



def line_comment_prefixes(path: Path) -> tuple[str, ...]:
    """Return recognized line comments for one language.

    Purpose:
        Prevent code syntax becoming comment prose accidentally.

    Inputs:
        path: Source path providing language context.

    Output:
        Supported standalone line-comment prefixes.
    """

    # Combine prefixes supported by the source suffix.
    suffix = path.suffix.lower()
    prefixes: list[str] = []
    if suffix in HASH_COMMENT_SUFFIXES:
        prefixes.append("#")
    if suffix in DASH_COMMENT_SUFFIXES:
        prefixes.append("--")
    if suffix in SLASH_COMMENT_SUFFIXES:
        prefixes.append("//")
    return tuple(prefixes)



def starts_standalone_comment(path: Path, text: str) -> bool:
    """Recognize a standalone source comment opening.

    Purpose:
        Support header and prose validation consistently.

    Inputs:
        path: Source path providing language context.
        text: Stripped source line.

    Output:
        True when the line opens a comment.
    """

    # Recognize universal block and docstring openings.
    if text.startswith(("/*", "<!--", '"""', "'''")):
        return True

    # Match language-specific line comment prefixes.
    return text.startswith(line_comment_prefixes(path))



def clean_comment_text(text: str) -> str:
    """Remove standalone comment syntax from one line.

    Purpose:
        Isolate prose for deterministic word counting.

    Inputs:
        text: Raw standalone comment line.

    Output:
        Comment prose without delimiters.
    """

    # Remove common opening and closing delimiters.
    cleaned = OPENING_COMMENT_PATTERN.sub("", text.strip())
    return CLOSING_COMMENT_PATTERN.sub("", cleaned).strip()



def count_header_comment_lines(
    path: Path,
    lines: Sequence[str],
    start_index: int,
) -> int:
    """Count explanatory lines in one file header.

    Purpose:
        Enforce concise ownership and boundary justification.

    Inputs:
        path: Source path providing language context.
        lines: Physical source lines.
        start_index: Zero-based header starting line.

    Output:
        Non-empty explanatory comment line count.
    """

    # Count multiline header content through its closer.
    first_line = lines[start_index].strip()
    block_openers = (("<!--", "-->"), ("/*", "*/"), ('"""', '"""'), ("'''", "'''"))
    opening = next((item for item in block_openers if first_line.startswith(item[0])), None)
    if opening is not None:
        opener, closer = opening
        count = 0
        for offset, line in enumerate(lines[start_index:]):
            content = clean_comment_text(line.strip())
            if content:
                count += 1
            if closer in line.strip()[len(opener) if offset == 0 else 0 :]:
                break
        return count

    # Count consecutive language-specific header lines.
    prefixes = line_comment_prefixes(path)
    count = 0
    for line in lines[start_index:]:
        stripped = line.strip()
        if not stripped.startswith(prefixes):
            break
        if clean_comment_text(stripped):
            count += 1
    return count



def iter_comment_lines(path: Path, lines: Sequence[str]) -> Iterator[tuple[int, str]]:
    """Yield standalone comment prose with source lines.

    Purpose:
        Follow line comments, blocks, and docstrings.

    Inputs:
        path: Source path providing language context.
        lines: Physical source lines.

    Output:
        Comment line numbers and prose.
    """

    # Follow standalone comments across block boundaries.
    active_closer: str | None = None
    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if active_closer is not None:
            yield line_number, clean_comment_text(stripped)
            if active_closer in stripped:
                active_closer = None
            continue

        # Open recognized multiline comment forms.
        block_openers = (("<!--", "-->"), ("/*", "*/"), ('"""', '"""'), ("'''", "'''"))
        opening = next((item for item in block_openers if stripped.startswith(item[0])), None)
        if opening is not None:
            opener, closer = opening
            yield line_number, clean_comment_text(stripped)
            if closer not in stripped[len(opener) :]:
                active_closer = closer
            continue

        # Yield only language-appropriate line comments.
        if stripped.startswith("#!"):
            continue
        if stripped.startswith(line_comment_prefixes(path)):
            yield line_number, clean_comment_text(stripped)



def check_comment_words(path: Path, lines: Sequence[str]) -> list[Finding]:
    """Check standalone comment line lengths.

    Purpose:
        Keep comments concise and visually scannable.

    Inputs:
        path: Inspected source path.
        lines: Physical source lines.

    Output:
        Overlong-comment findings.
    """

    # Count prose words on each recognized comment line.
    findings: list[Finding] = []
    for line_number, comment in iter_comment_lines(path, lines):
        word_count = len(WORD_PATTERN.findall(comment))
        if word_count > 10:
            message = f"Comment has {word_count} words; maximum is 10."
            findings.append(Finding(path, line_number, "ERROR", message))
    return findings
