# Defines shared validation results for checker modules.
# Prevents diagnostic shapes drifting between responsibilities.

from dataclasses import dataclass
from pathlib import Path


# Carry one editor-friendly validation result.
@dataclass(frozen=True)
class Finding:
    """Describe one readability validation result.

    Purpose:
        Carry structured details between validation steps.

    Inputs:
        path: Inspected source path.
        line: Related source line.
        level: Finding severity.
        message: Human-readable result.

    Output:
        Immutable validation finding.
    """

    path: Path
    line: int
    level: str
    message: str
