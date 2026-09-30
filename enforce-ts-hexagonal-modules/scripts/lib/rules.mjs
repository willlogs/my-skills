// Defines strict hexagonal architecture validation rules.
// Keeps policy independent from compiler traversal.

const forbiddenConfiguration = [
  /configure[A-Z]\w*Ports?/,
  /set[A-Z]\w*Ports?/,
  /serviceLocator/i,
  /container\.resolve/,
];




/**
 * Determines whether one internal import is allowed.
 *
 * Purpose: Encode strict layer dependency direction.
 *
 * @param {object} source Source architectural classification.
 * @param {object} target Target architectural classification.
 * @returns {string|undefined} Violation explanation.
 */
export function boundaryViolation(source, target) {
  // Allow composition to construct the complete graph.
  if (source.kind === 'composition') return undefined;

  // Protect core and shared infrastructure from modules.
  if (source.kind === 'core') {
    return target.kind === 'core' ? undefined : 'core may only import core';
  }
  if (source.kind === 'root-infrastructure') {
    return ['core', 'generated', 'root-infrastructure'].includes(target.kind)
      ? undefined
      : 'root infrastructure imports forbidden layer';
  }
  if (source.kind !== 'module') return undefined;

  // Enforce the sole legal cross-module dependency.
  if (target.kind === 'module' && source.module !== target.module) {
    const legal = source.layer === 'adapters'
      && target.layer === 'domain'
      && target.tail === 'driver.ts';
    return legal ? undefined : 'cross-module imports require adapter → driver';
  }

  // Apply permissions inside the owning module.
  const targetKind = target.kind;
  const targetLayer = target.layer;
  const allowed = {
    domain: targetKind === 'module' && targetLayer === 'domain',
    application: targetKind === 'core'
      || (targetKind === 'module'
        && ['domain', 'application'].includes(targetLayer)),
    adapters: targetKind === 'core'
      || targetKind === 'generated'
      || targetKind === 'root-infrastructure'
      || (targetKind === 'module'
        && ['domain', 'adapters', 'infrastructure'].includes(targetLayer)),
    infrastructure: targetKind === 'core'
      || targetKind === 'generated'
      || (targetKind === 'module'
        && ['domain', 'infrastructure'].includes(targetLayer)),
    interface: targetKind === 'core'
      || (targetKind === 'module'
        && targetLayer === 'interface')
      || (targetKind === 'module'
        && targetLayer === 'domain'
        && target.tail === 'driver.ts'),
  }[source.layer];

  return allowed ? undefined : `${source.layer} imports forbidden layer`;
}




/**
 * Finds hidden dependency configuration.
 *
 * Purpose: Reject service locators and mutable port wiring.
 *
 * @param {string} text Complete source text.
 * @returns {object|undefined} Violation details.
 */
export function configurationViolation(text) {
  // Match known hidden-wiring conventions.
  for (const pattern of forbiddenConfiguration) {
    const match = pattern.exec(text);
    if (match) {
      return {
        index: match.index,
        message: 'dependency wiring belongs in composition',
      };
    }
  }
  return undefined;
}
