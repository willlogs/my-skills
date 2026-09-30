// Inspects parsed TypeScript syntax for architecture rules.
// Keeps source queries separate from project loading.

import path from 'node:path';




/**
 * Describes a source file's architectural location.
 *
 * Purpose: Centralize layer and module detection.
 *
 * @param {string} file Absolute source filename.
 * @param {object} locations Audited architecture locations.
 * @returns {object} Architectural classification.
 */
export function classify(file, locations) {
  // Convert the source path into stable segments.
  const relative = path.relative(locations.src, file);
  const parts = relative.split(path.sep);
  if (file === locations.composition) return { kind: 'composition' };
  if (parts[0] === 'core') return { kind: 'core' };
  if (parts[0] === 'generated') return { kind: 'generated' };
  if (parts[0] === 'infrastructure') {
    return { kind: 'root-infrastructure' };
  }
  if (parts[0] !== 'modules') {
    return { kind: 'root', layer: parts[0] };
  }
  return {
    kind: 'module',
    module: parts[1],
    layer: parts[2],
    tail: parts.slice(3).join('/'),
  };
}




/**
 * Resolves an import using TypeScript configuration.
 *
 * Purpose: Support aliases and relative module paths.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {string} specifier Imported module specifier.
 * @param {string} containingFile File owning the import.
 * @param {object} compilerOptions Parsed compiler options.
 * @returns {string|undefined} Resolved filename.
 */
export function resolveImport(
  ts,
  specifier,
  containingFile,
  compilerOptions,
) {
  // Ask TypeScript to apply project resolution rules.
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  );
  return result.resolvedModule?.resolvedFileName;
}




/**
 * Collects static and runtime module references.
 *
 * Purpose: Cover imports, exports, require, and import calls.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {object} source Parsed TypeScript source.
 * @returns {Array<object>} Module reference nodes.
 */
export function collectImports(ts, source) {
  const imports = [];

  // Walk every syntax node containing module references.
  function visit(node) {
    const moduleNode = node.moduleSpecifier;
    if (moduleNode && ts.isStringLiteralLike(moduleNode)) {
      imports.push({ node: moduleNode, specifier: moduleNode.text });
    }

    if (ts.isCallExpression(node)) {
      const called = node.expression;
      const isDynamic = called.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(called) && called.text === 'require';
      const argument = node.arguments[0];
      if ((isDynamic || isRequire) && ts.isStringLiteralLike(argument)) {
        imports.push({ node: argument, specifier: argument.text });
      }
    }
    ts.forEachChild(node, visit);
  }

  // Start recursive syntax traversal.
  visit(source);
  return imports;
}




/**
 * Finds meaningful identifier usage outside imports.
 *
 * Purpose: Verify port implementation coverage.
 *
 * @param {object} ts TypeScript compiler module.
 * @param {object} source Parsed TypeScript source.
 * @param {string} name Contract identifier.
 * @returns {boolean} Whether implementation code references it.
 */
export function usesContract(ts, source, name) {
  let used = false;

  // Ignore declaration-only import and export references.
  function visit(node) {
    if (used) return;
    if (
      ts.isIdentifier(node)
      && node.text === name
      && !ts.findAncestor(node, (parent) => (
        ts.isImportDeclaration(parent)
        || ts.isExportDeclaration(parent)
      ))
    ) {
      used = true;
      return;
    }
    ts.forEachChild(node, visit);
  }

  // Search the complete implementation syntax tree.
  visit(source);
  return used;
}




/**
 * Adds one source-positioned architecture violation.
 *
 * Purpose: Produce actionable deterministic diagnostics.
 *
 * @param {Array<object>} errors Mutable diagnostic collection.
 * @param {object} source Parsed source file.
 * @param {object} node Node owning the violation.
 * @param {string} message Human-readable violation.
 * @returns {void} No value.
 */
export function report(errors, source, node, message) {
  // Convert offsets into editor-friendly coordinates.
  const position = source.getLineAndCharacterOfPosition(node.getStart(source));
  errors.push({
    file: source.fileName,
    line: position.line + 1,
    column: position.character + 1,
    message,
  });
}
