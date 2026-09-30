// Audits bounded-context contracts and implementations.
// Keeps module ownership checks separate from import rules.

import fs from 'node:fs';
import path from 'node:path';
import {
  requireAdapterOwnership,
  requireCoverage,
} from './analysis/coverage.mjs';




/**
 * Reports missing module boundary files.
 *
 * Purpose: Require explicit driver and driven contracts.
 *
 * @param {string} base Absolute module folder.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {object} Expected contract filenames.
 */
function requireContracts(base, errors) {
  // Define both mandatory domain boundary files.
  const files = {
    driver: path.join(base, 'domain', 'driver.ts'),
    driven: path.join(base, 'domain', 'driven.ts'),
  };
  for (const required of Object.values(files)) {
    if (!fs.existsSync(required)) {
      errors.push({
        file: required,
        line: 1,
        column: 1,
        message: 'module requires domain/driver.ts and domain/driven.ts',
      });
    }
  }
  return files;
}




/**
 * Reports files outside named module layers.
 *
 * Purpose: Prevent ambiguous module-level responsibilities.
 *
 * @param {string} base Absolute module folder.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {void} No value.
 */
function rejectLooseFiles(base, errors) {
  // Inspect direct children for unlayered files.
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (entry.isFile()) {
      errors.push({
        file: path.join(base, entry.name),
        line: 1,
        column: 1,
        message: 'module files must live inside a named layer',
      });
    }
  }
}




/**
 * Audits one module's required contracts and coverage.
 *
 * Purpose: Ensure every boundary owns an implementation.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {string} moduleName Audited module name.
 * @param {Map<string, object>} sources Parsed source files.
 * @param {object} locations Audited architecture locations.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {void} No value.
 */
export function auditModule(
  ts,
  moduleName,
  sources,
  locations,
  errors,
) {
  // Establish and validate the module boundary files.
  const base = path.join(locations.modules, moduleName);
  const files = requireContracts(base, errors);
  rejectLooseFiles(base, errors);

  // Match public and required contracts to implementations.
  requireCoverage(
    ts,
    moduleName,
    sources,
    locations,
    { file: files.driver, layer: 'application', label: 'driver' },
    errors,
  );
  requireCoverage(
    ts,
    moduleName,
    sources,
    locations,
    { file: files.driven, layer: 'adapters', label: 'driven port' },
    errors,
  );
  requireAdapterOwnership(
    ts,
    moduleName,
    sources,
    locations,
    files.driven,
    errors,
  );
}
