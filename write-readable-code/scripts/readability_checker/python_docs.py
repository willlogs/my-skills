# Validates hover-ready documentation for Python functions.
# Keeps documentation checks independent from spacing rules.

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Sequence

from .models import Finding


# Define recognized functions and documentation section labels.
FUNCTION_NODES = (ast.FunctionDef, ast.AsyncFunctionDef)
INPUT_HEADINGS = ("inputs:", "args:", "arguments:", "parameters:")
OUTPUT_HEADINGS = ("output:", "returns:", "yields:")


def function_parameters(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
) -> list[str]:
    """Collect user-provided function parameter names.

    Purpose:
        Compare declared inputs with hover documentation.

    Inputs:
        node: Parsed function declaration.

    Output:
        Parameters excluding implicit instance receivers.
    """

    # Combine every supported Python parameter category.
    arguments = [*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs]
    names = [argument.arg for argument in arguments]
    if node.args.vararg is not None:
        names.append(node.args.vararg.arg)
    if node.args.kwarg is not None:
        names.append(node.args.kwarg.arg)
    return [name for name in names if name not in {"self", "cls"}]



def check_function_documentation(
    path: Path,
    node: ast.FunctionDef | ast.AsyncFunctionDef,
) -> list[Finding]:
    """Check one Python function's hover documentation.

    Purpose:
        Require description, purpose, inputs, and output.

    Inputs:
        path: Inspected Python path.
        node: Parsed function declaration.

    Output:
        Documentation findings for one function.
    """

    # Require a language-server-visible function docstring.
    docstring = ast.get_docstring(node, clean=False)
    if not docstring:
        message = f"Function {node.name} requires hover documentation."
        return [Finding(path, node.lineno, "ERROR", message)]

    # Check every required documentation section.
    lowered = docstring.lower()
    findings: list[Finding] = []
    if "purpose:" not in lowered:
        findings.append(Finding(path, node.lineno, "ERROR", "Function documentation lacks Purpose."))
    if not any(heading in lowered for heading in INPUT_HEADINGS):
        findings.append(Finding(path, node.lineno, "ERROR", "Function documentation lacks inputs."))
    if not any(heading in lowered for heading in OUTPUT_HEADINGS):
        findings.append(Finding(path, node.lineno, "ERROR", "Function documentation lacks output."))

    # Confirm every explicit parameter appears in documentation.
    for parameter in function_parameters(node):
        if re.search(rf"\b{re.escape(parameter)}\b", docstring) is None:
            message = f"Function documentation omits parameter {parameter}."
            findings.append(Finding(path, node.lineno, "ERROR", message))

    # Require explicit absence when no inputs exist.
    if not function_parameters(node) and "none" not in lowered:
        findings.append(Finding(path, node.lineno, "ERROR", "No-input function must document None."))
    return findings



def check_python_documentation(path: Path, lines: Sequence[str]) -> list[Finding]:
    """Check every Python function's hover documentation.

    Purpose:
        Apply documentation requirements syntax-aware.

    Inputs:
        path: Inspected source path.
        lines: Physical source lines.

    Output:
        Python documentation findings.
    """

    # Ignore source languages handled by manual checks.
    if path.suffix.lower() != ".py":
        return []

    # Skip documentation checks until Python parses.
    try:
        tree = ast.parse("\n".join(lines))
    except SyntaxError:
        return []

    # Validate every nested and top-level function.
    findings: list[Finding] = []
    for node in ast.walk(tree):
        if isinstance(node, FUNCTION_NODES):
            findings.extend(check_function_documentation(path, node))
    return findings
