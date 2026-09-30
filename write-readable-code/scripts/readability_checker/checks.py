# Composes deterministic structural readability checks.
# Keeps individual rules small and independently understandable.

from __future__ import annotations

from pathlib import Path
from typing import Sequence

from .comments import (
    check_comment_words,
    count_header_comment_lines,
    starts_standalone_comment,
)
from .discovery import is_generated_source, read_source_lines
from .models import Finding
from .python_docs import check_python_documentation
from .python_spacing import check_python_spacing



def check_line_count(path: Path, lines: Sequence[str]) -> list[Finding]:
    """Check one file's physical line count.

    Purpose:
        Enforce the ceiling and split-review threshold.

    Inputs:
        path: Inspected source path.
        lines: Physical source lines.

    Output:
        Size-related findings.
    """

    # Report the strongest applicable size boundary.
    count = len(lines)
    if count > 300:
        return [Finding(path, 301, "ERROR", f"File has {count} lines; maximum is 300.")]
    if count > 200:
        return [Finding(path, 201, "WARNING", f"File has {count} lines; review splitting.")]
    return []



def check_blank_runs(path: Path, lines: Sequence[str]) -> list[Finding]:
    """Check consecutive line-break separation.

    Purpose:
        Prevent whitespace beyond major-subject separation.

    Inputs:
        path: Inspected source path.
        lines: Physical source lines.

    Output:
        Excessive-whitespace findings.
    """

    # Track blank runs and report each overflow once.
    findings: list[Finding] = []
    blank_count = 0
    for line_number, line in enumerate(lines, start=1):
        blank_count = blank_count + 1 if not line.strip() else 0
        if blank_count == 5:
            findings.append(
                Finding(path, line_number, "ERROR", "More than five consecutive line breaks.")
            )
    return findings



def check_file_header(path: Path, lines: Sequence[str]) -> list[Finding]:
    """Check for a top-of-file responsibility comment.

    Purpose:
        Require immediate file ownership context.

    Inputs:
        path: Inspected source path.
        lines: Physical source lines.

    Output:
        Missing-header findings.
    """

    # Skip only syntax-required file prologues.
    for line_number, line in enumerate(lines[:12], start=1):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("#!", "<?php", "<?xml")):
            continue
        if "coding:" in stripped or "coding=" in stripped:
            continue
        if starts_standalone_comment(path, stripped):
            header_lines = count_header_comment_lines(path, lines, line_number - 1)
            if 2 <= header_lines <= 3:
                return []
            message = "File header requires two or three comment lines."
            return [Finding(path, line_number, "ERROR", message)]
        return [Finding(path, line_number, "ERROR", "Missing top-of-file responsibility comment.")]
    return [Finding(path, 1, "ERROR", "Missing top-of-file responsibility comment.")]



def inspect_source_file(path: Path) -> list[Finding]:
    """Run every deterministic check on one source file.

    Purpose:
        Compose structural readability validation.

    Inputs:
        path: Source file to inspect.

    Output:
        All findings for the source file.
    """

    # Load source content before applying checks.
    lines, read_error = read_source_lines(path)
    if read_error is not None:
        return [read_error]
    if is_generated_source(lines):
        return []

    # Combine independent structural checks.
    findings: list[Finding] = []
    findings.extend(check_line_count(path, lines))
    findings.extend(check_blank_runs(path, lines))
    findings.extend(check_comment_words(path, lines))
    findings.extend(check_file_header(path, lines))
    findings.extend(check_python_documentation(path, lines))
    findings.extend(check_python_spacing(path, lines))
    return findings
