# Owns terminal interaction for readability validation.
# Keeps user reporting separate from source inspection.

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .checks import inspect_source_file
from .discovery import collect_source_files
from .models import Finding



def parse_arguments(arguments: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse readability checker arguments.

    Purpose:
        Define the supported validation command.

    Inputs:
        arguments: Optional command arguments.

    Output:
        Parsed command namespace.
    """

    # Configure target path collection.
    parser = argparse.ArgumentParser(
        description="Check source files against readable-code boundaries."
    )
    parser.add_argument("paths", nargs="+", type=Path)

    # Return normalized command arguments.
    return parser.parse_args(arguments)



def finding_sort_key(finding: Finding) -> tuple[str, int, str]:
    """Build a stable finding sort key.

    Purpose:
        Keep diagnostics deterministic across runs.

    Inputs:
        finding: Structured validation result.

    Output:
        Path, line, and severity key.
    """

    # Order diagnostics for predictable review.
    return str(finding.path), finding.line, finding.level



def format_finding(finding: Finding) -> str:
    """Format one finding for terminal output.

    Purpose:
        Produce stable editor-friendly diagnostics.

    Inputs:
        finding: Structured validation result.

    Output:
        Printable diagnostic line.
    """

    # Include a line only when one exists.
    location = str(finding.path)
    if finding.line:
        location = f"{location}:{finding.line}"
    return f"{location}: {finding.level}: {finding.message}"



def main(arguments: Sequence[str] | None = None) -> int:
    """Validate requested source paths.

    Purpose:
        Report findings and return automation-friendly status.

    Inputs:
        arguments: Optional command arguments.

    Output:
        Zero without errors, otherwise one.

    Side effects:
        Prints diagnostics and validation totals.
    """

    # Discover files and collect validation findings.
    options = parse_arguments(arguments)
    files, findings = collect_source_files(options.paths)
    for path in files:
        findings.extend(inspect_source_file(path))

    # Print stable diagnostics before the summary.
    for finding in sorted(findings, key=finding_sort_key):
        print(format_finding(finding))

    # Summarize severities for human review.
    error_count = sum(finding.level == "ERROR" for finding in findings)
    warning_count = sum(finding.level == "WARNING" for finding in findings)
    print(f"Checked {len(files)} files: {error_count} errors, {warning_count} warnings.")
    return 1 if error_count else 0
