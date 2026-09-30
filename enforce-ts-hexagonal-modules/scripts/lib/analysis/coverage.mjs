// Verifies module contracts have owned implementations.
// Keeps coverage rules separate from module discovery.

import { normalize } from '../project.mjs';
import {
  classify,
  report,
  usesContract,
} from './source.mjs';




/**
 * Reports contracts without owned implementations.
 *
 * Purpose: Ensure every port has one concrete boundary.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {string} moduleName Audited module name.
 * @param {Map<string, object>} sources Parsed source files.
 * @param {object} locations Audited architecture locations.
 * @param {object} check Contract coverage configuration.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {void} No value.
 */
export function requireCoverage(
  ts,
  moduleName,
  sources,
  locations,
  check,
  errors,
) {
  // Read every interface declared by the contract.
  const contract = sources.get(normalize(check.file));
  if (!contract) return;
  for (const statement of contract.statements) {
    if (!ts.isInterfaceDeclaration(statement)) continue;
    const name = statement.name.text;

    // Find implementation usage in the owning layer.
    const covered = [...sources.values()].some((source) => {
      const place = classify(source.fileName, locations);
      return place.kind === 'module'
        && place.module === moduleName
        && place.layer === check.layer
        && usesContract(ts, source, name);
    });
    if (!covered) {
      report(
        errors,
        contract,
        statement.name,
        `${check.label} ${name} has no ${check.layer} implementation`,
      );
    }
  }
}




/**
 * Reports adapters without local driven-port ownership.
 *
 * Purpose: Prevent adapters becoming arbitrary shared utilities.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {string} moduleName Audited module name.
 * @param {Map<string, object>} sources Parsed source files.
 * @param {object} locations Audited architecture locations.
 * @param {string} drivenFile Absolute driven contract filename.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {void} No value.
 */
export function requireAdapterOwnership(
  ts,
  moduleName,
  sources,
  locations,
  drivenFile,
  errors,
) {
  // Collect every local driven-port interface.
  const driven = sources.get(normalize(drivenFile));
  const names = driven?.statements
    .filter(ts.isInterfaceDeclaration)
    .map((statement) => statement.name.text) ?? [];

  // Ensure each top-level adapter references one local port.
  for (const source of sources.values()) {
    const place = classify(source.fileName, locations);
    if (
      place.kind !== 'module'
      || place.module !== moduleName
      || place.layer !== 'adapters'
      || place.tail.includes('/')
    ) continue;
    if (!names.some((name) => usesContract(ts, source, name))) {
      report(errors, source, source, 'adapter must implement a local driven port');
    }
  }
}
