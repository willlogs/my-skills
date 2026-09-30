// Handles architecture-checker command input and output.
// Keeps presentation separate from audit behavior.

import path from 'node:path';
import process from 'node:process';
import { normalize } from './project.mjs';




/**
 * Reads one named command-line option.
 *
 * Purpose: Keep command parsing dependency-free.
 *
 * @param {string} name Option name without prefix.
 * @param {string} fallback Value returned when absent.
 * @returns {string} Parsed option value.
 */
function option(name, fallback) {
  // Find the option and its following value.
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}




/**
 * Builds architecture locations from command options.
 *
 * Purpose: Centralize configurable project conventions.
 *
 * @returns {object} Normalized architecture locations.
 */
export function buildLocations() {
  // Resolve every convention against the application root.
  const root = normalize(option('root', process.cwd()));
  const src = normalize(path.join(root, option('src', 'src')));
  return {
    root,
    src,
    modules: normalize(path.join(src, option('modules', 'modules'))),
    composition: normalize(
      path.join(src, option('composition', 'composition.ts')),
    ),
  };
}




/**
 * Prints stable diagnostics for editors and CI.
 *
 * Purpose: Make failures actionable and reproducible.
 *
 * @param {Array<object>} errors Architecture diagnostics.
 * @param {object} locations Audited architecture locations.
 * @param {number} sourceCount Parsed source count.
 * @returns {number} Process exit code.
 */
export function printResults(errors, locations, sourceCount) {
  // Sort diagnostics by location before rendering.
  errors.sort((left, right) => (
    left.file.localeCompare(right.file)
    || left.line - right.line
    || left.column - right.column
  ));

  for (const error of errors) {
    const relative = path.relative(locations.root, error.file);
    console.error(
      `${relative}:${error.line}:${error.column} ${error.message}`,
    );
  }

  // Print one concise audit summary.
  console.log(
    errors.length
      ? `Architecture failed with ${errors.length} violation(s).`
      : `Architecture passed across ${sourceCount} source file(s).`,
  );
  return errors.length ? 1 : 0;
}
