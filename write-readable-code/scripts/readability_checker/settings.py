# Owns source-format boundaries for readability validation.
# Keeps language recognition separate from checking logic.

import re


# Identify handwritten source formats inspected during directory scans.
SOURCE_SUFFIXES = frozenset(
    {
        ".c",
        ".cc",
        ".cjs",
        ".cpp",
        ".cs",
        ".css",
        ".cts",
        ".dart",
        ".ex",
        ".exs",
        ".fs",
        ".fsx",
        ".go",
        ".h",
        ".hpp",
        ".html",
        ".java",
        ".js",
        ".jsx",
        ".kt",
        ".kts",
        ".lua",
        ".mjs",
        ".mts",
        ".php",
        ".py",
        ".rb",
        ".rs",
        ".scala",
        ".scss",
        ".sh",
        ".sql",
        ".svelte",
        ".swift",
        ".tsx",
        ".ts",
        ".vue",
        ".zig",
    }
)

# Exclude dependencies and machine-owned build folders.
IGNORED_DIRECTORIES = frozenset(
    {
        ".git",
        ".next",
        ".nuxt",
        ".venv",
        "build",
        "coverage",
        "dist",
        "generated",
        "node_modules",
        "target",
        "vendor",
    }
)

# Detect conventional machine-ownership declarations near file headers.
GENERATED_MARKERS = (
    "automatically generated",
    "auto-generated",
    "code generated",
    "do not edit",
    "generated file",
)

# Match words consistently across supported comment syntaxes.
WORD_PATTERN = re.compile(r"[A-Za-z0-9_@]+(?:[-'][A-Za-z0-9_@]+)*")
OPENING_COMMENT_PATTERN = re.compile(
    r"^(?:\"\"\"|'''|//+|#+|--+|/\*+|<!--|\*+)\s*"
)
CLOSING_COMMENT_PATTERN = re.compile(r"\s*(?:\*/|-->|\"\"\"|''')$")

# Map language families to standalone line-comment prefixes.
HASH_COMMENT_SUFFIXES = frozenset({".ex", ".exs", ".php", ".py", ".rb", ".sh"})
DASH_COMMENT_SUFFIXES = frozenset({".lua", ".sql"})
SLASH_COMMENT_SUFFIXES = frozenset(
    {
        ".c",
        ".cc",
        ".cjs",
        ".cpp",
        ".cs",
        ".cts",
        ".dart",
        ".fs",
        ".fsx",
        ".go",
        ".h",
        ".hpp",
        ".java",
        ".js",
        ".jsx",
        ".kt",
        ".kts",
        ".mjs",
        ".mts",
        ".php",
        ".rs",
        ".scala",
        ".scss",
        ".svelte",
        ".swift",
        ".tsx",
        ".ts",
        ".vue",
        ".zig",
    }
)
