// Parses TypeScript projects for architecture rules.
// Isolates compiler-specific source inspection.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';




/**
 * Returns normalized absolute paths.
 *
 * Purpose: Make boundary comparisons platform-safe.
 *
 * @param {string} value Path requiring normalization.
 * @returns {string} Normalized absolute path.
 */
export function normalize(value) {
  // Resolve separators and relative segments.
  return path.normalize(path.resolve(value));
}




/**
 * Loads and parses one application's TypeScript project.
 *
 * Purpose: Reuse the audited project's compiler rules.
 *
 * @param {string} root Absolute application root.
 * @param {string} src Absolute source root.
 * @returns {object|undefined} Parsed project information.
 */
export function loadProject(root, src) {
  // Resolve TypeScript from the application's dependencies.
  const require = createRequire(path.join(root, 'package.json'));
  let ts;
  try {
    ts = require('typescript');
  } catch {
    console.error('Install typescript in the audited application.');
    return undefined;
  }

  // Read the nearest application TypeScript configuration.
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    console.error(`Missing tsconfig.json under ${root}`);
    return undefined;
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );

  // Parse handwritten source files into syntax trees.
  const sources = new Map();
  for (const filename of parsed.fileNames) {
    const normalized = normalize(filename);
    if (!normalized.startsWith(`${src}${path.sep}`)) continue;
    if (normalized.endsWith('.d.ts')) continue;
    const text = fs.readFileSync(normalized, 'utf8');
    sources.set(
      normalized,
      ts.createSourceFile(normalized, text, ts.ScriptTarget.Latest, true),
    );
  }
  return { ts, options: parsed.options, sources };
}
