# Discovers readable source targets and loads their content.
# Isolates filesystem traversal from validation rules.

from __future__ import annotations

import os
from pathlib import Path
from typing import Sequence

from .models import Finding
from .settings import GENERATED_MARKERS, IGNORED_DIRECTORIES, SOURCE_SUFFIXES



def collect_source_files(paths: Sequence[Path]) -> tuple[list[Path], list[Finding]]:
    """Collect supported source files from target paths.

    Purpose:
        Normalize file and directory inputs deterministically.

    Inputs:
        paths: Requested files or directories.

    Output:
        Sorted files and discovery findings.
    """

    # Discover supported files from each target.
    files: set[Path] = set()
    findings: list[Finding] = []
    for path in paths:
        if not path.exists():
            findings.append(Finding(path, 0, "ERROR", "Target path does not exist."))
            continue

        if path.is_file():
            if path.suffix.lower() in SOURCE_SUFFIXES:
                files.add(path)
            else:
                findings.append(Finding(path, 0, "WARNING", "Unsupported source format skipped."))
            continue

        # Prune ignored folders before recursive traversal.
        for root, directory_names, file_names in os.walk(path):
            directory_names[:] = [
                name for name in directory_names if name not in IGNORED_DIRECTORIES
            ]
            root_path = Path(root)
            for file_name in file_names:
                candidate = root_path / file_name
                if candidate.suffix.lower() in SOURCE_SUFFIXES:
                    files.add(candidate)

    # Stabilize validation and reporting order.
    return sorted(files), findings



def read_source_lines(path: Path) -> tuple[list[str], Finding | None]:
    """Read one UTF-8 source file safely.

    Purpose:
        Convert source content into physical lines.

    Inputs:
        path: Source file to inspect.

    Output:
        Source lines and an optional error.
    """

    # Read source without normalizing physical lines.
    try:
        return path.read_text(encoding="utf-8").splitlines(), None
    except (OSError, UnicodeError) as error:
        finding = Finding(path, 0, "ERROR", f"Unable to read source: {error}")
        return [], finding



def is_generated_source(lines: Sequence[str]) -> bool:
    """Detect common generated-source ownership markers.

    Purpose:
        Avoid reporting machine-owned source files.

    Inputs:
        lines: Physical source lines.

    Output:
        True when generated ownership is declared.
    """

    # Search only the conventional header region.
    header = "\n".join(lines[:20]).lower()
    return any(marker in header for marker in GENERATED_MARKERS)
