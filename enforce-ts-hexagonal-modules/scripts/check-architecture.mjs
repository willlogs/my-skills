#!/usr/bin/env node
// Coordinates the complete TypeScript architecture audit.
// Keeps command handling separate from reusable rules.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  loadProject,
  normalize,
} from './lib/project.mjs';
import {
  classify,
  collectImports,
  report,
  resolveImport,
} from './lib/analysis/source.mjs';
import {
  boundaryViolation,
  configurationViolation,
} from './lib/rules.mjs';
import { collectConstructions } from './lib/construction.mjs';
import { auditModule } from './lib/module.mjs';
import { buildLocations, printResults } from './lib/cli.mjs';




/**
 * Audits every resolved internal import.
 *
 * Purpose: Enforce dependency direction across parsed sources.
 *
 * @param {object} project Parsed TypeScript project.
 * @param {object} locations Audited architecture locations.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {void} No value.
 */
function auditImports(project, locations, errors) {
  // Inspect every syntax-resolved dependency.
  for (const source of project.sources.values()) {
    const sourcePlace = classify(source.fileName, locations);

    for (const imported of collectImports(project.ts, source)) {
      const resolved = resolveImport(
        project.ts,
        imported.specifier,
        source.fileName,
        project.options,
      );
      if (!resolved) {
        const restricted = sourcePlace.kind === 'module'
          && ['domain', 'application'].includes(sourcePlace.layer);
        const external = !imported.specifier.startsWith('.');
        if (restricted && external) {
          report(
            errors,
            source,
            imported.node,
            `${sourcePlace.layer} may not import external packages`,
          );
        }
        continue;
      }

      const targetFile = normalize(resolved);
      if (!targetFile.startsWith(`${locations.src}${path.sep}`)) {
        if (
          sourcePlace.kind === 'module'
          && ['domain', 'application'].includes(sourcePlace.layer)
        ) {
          report(
            errors,
            source,
            imported.node,
            `${sourcePlace.layer} may not import external packages`,
          );
        }
        continue;
      }

      const violation = boundaryViolation(
        sourcePlace,
        classify(targetFile, locations),
      );
      if (violation) report(errors, source, imported.node, violation);
    }

    // Reject hidden mutable wiring and service location.
    if (source.fileName !== locations.composition) {
      const violation = configurationViolation(source.text);
      if (violation) {
        const node = { getStart: () => violation.index };
        report(errors, source, node, violation.message);
      }

      // Reject dependency-bearing construction outside composition.
      for (const construction of collectConstructions(project.ts, source)) {
        const resolved = resolveImport(
          project.ts,
          construction.specifier,
          source.fileName,
          project.options,
        );
        if (!resolved) continue;
        const target = classify(normalize(resolved), locations);
        if (
          target.kind === 'module'
          && ['application', 'adapters', 'infrastructure'].includes(
            target.layer,
          )
        ) {
          report(
            errors,
            source,
            construction.node,
            `${construction.name} must be constructed in composition`,
          );
        }
      }
    }
  }
}




/**
 * Audits every discovered bounded context.
 *
 * Purpose: Enforce contracts and implementation ownership.
 *
 * @param {object} project Parsed TypeScript project.
 * @param {object} locations Audited architecture locations.
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @returns {boolean} Whether the modules directory exists.
 */
function auditModules(project, locations, errors) {
  // Stop when the expected module boundary is absent.
  if (!fs.existsSync(locations.modules)) {
    console.error(`Missing modules directory: ${locations.modules}`);
    return false;
  }

  // Audit each folder as one bounded context.
  for (
    const entry of fs.readdirSync(
      locations.modules,
      { withFileTypes: true },
    )
  ) {
    if (entry.isDirectory()) {
      auditModule(
        project.ts,
        entry.name,
        project.sources,
        locations,
        errors,
      );
    }
  }
  return true;
}




/**
 * Runs the complete architecture audit.
 *
 * Purpose: Coordinate parsing and every hard check.
 *
 * @returns {number} Process exit code.
 */
function main() {
  // Load project sources using its TypeScript configuration.
  const locations = buildLocations();
  if (!fs.existsSync(locations.composition)) {
    console.error(`Missing composition root: ${locations.composition}`);
    return 2;
  }
  const project = loadProject(locations.root, locations.src);
  if (!project) return 2;

  // Apply dependency and bounded-context rules.
  const errors = [];
  auditImports(project, locations, errors);
  if (!auditModules(project, locations, errors)) return 2;

  // Return the deterministic diagnostic outcome.
  return printResults(errors, locations, project.sources.size);
}




// Exit with the deterministic audit result.
process.exitCode = main();
