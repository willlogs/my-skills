# Runs readability validation from one stable script path.
# Keeps package internals hidden from skill users.

from readability_checker.cli import main




if __name__ == "__main__":
    # Return validation status to the invoking process.
    raise SystemExit(main())
