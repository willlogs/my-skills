---
name: enforce-ts-hexagonal-modules
description: Enforce strict DDD and hexagonal architecture in modular TypeScript applications. Use when creating, changing, reviewing, or refactoring TypeScript modules, ports, adapters, application services, infrastructure, composition roots, dependency injection, or cross-module workflows; also use when auditing architecture, preventing direct module reach-through, or adding automated boundary checks.
---

# Enforce TypeScript Hexagonal Modules

Keep business modules autonomous. Connect them only through consumer-owned
adapters and provider driver contracts. Construct the entire object graph in the
application's root `composition.ts`.

## Required workflow

1. Read repository instructions and inspect the existing source tree.
2. Identify bounded contexts before editing code.
3. Read [architecture.md](references/architecture.md) completely.
4. Model each module's offered and required capabilities first.
5. Put offered contracts in `domain/driver.ts`.
6. Put required contracts in `domain/driven.ts`.
7. Implement drivers inside the owning module's application layer.
8. Implement every driven port with a consumer-owned adapter.
9. Wire all services, drivers, adapters, and infrastructure in `composition.ts`.
10. Run the architecture scanner after every structural change.
11. Run typechecks and relevant tests.
12. Fix violations; never waive them silently.

## Required module shape

```text
src/
├── core/
├── infrastructure/
├── modules/
│   └── <module>/
│       ├── domain/
│       │   ├── driver.ts
│       │   ├── driven.ts
│       │   └── <owned-domain-types>.ts
│       ├── application/
│       ├── adapters/
│       │   └── <capability>.ts
│       ├── infrastructure/
│       └── interface/
├── composition.ts
└── index.ts
```

Create only folders containing real files. Split large responsibilities into
named subfolders without weakening layer boundaries.

## Non-negotiable boundaries

- Keep `domain/` pure and dependent only on its own domain.
- Keep `application/` dependent only on its domain, application, and `core/`.
- Make application services implement their module's driver contracts.
- Make application services accept only driven ports as external dependencies.
- Keep raw external clients in root `infrastructure/`.
- Keep module-specific runtime technology in module `infrastructure/`.
- Make `adapters/` implement the owning module's driven ports.
- Let consumer adapters translate foreign driver types into local domain types.
- Import another module only from a consumer-owned adapter.
- Import only the provider's `domain/driver.ts` across that boundary.
- Re-export needed provider contract types from `domain/driver.ts`.
- Keep `interface/` as an inbound adapter over its module driver.
- Construct dependency-bearing objects only in root `composition.ts`.
- Keep `index.ts` limited to bootstrap and lifecycle wiring.
- Never add service locators, global mutable port registries, or hidden wiring.
- Never import another module's application, adapter, infrastructure, or interface.
- Never share domain entities directly between bounded contexts.

## Port ownership

Treat direction as ownership, not transport direction.

- `domain/driver.ts`: what this module offers.
- `domain/driven.ts`: what this module requires.
- `application/`: implements its own drivers.
- `adapters/`: implements its own driven ports.
- `composition.ts`: connects adapters to foreign drivers or infrastructure.

Other modules may import a provider driver type only inside their adapter. They
must not construct or import the provider's application implementation.

## Hard validation

Run:

```bash
node <skill-directory>/scripts/check-architecture.mjs \
  --root <application-root>
```

The application root must contain `tsconfig.json` and `src/`. The scanner uses
the application's installed `typescript` package and exits nonzero on failure.
It checks:

- required module folders and boundary contract files;
- forbidden loose files;
- layer dependency direction;
- cross-module imports;
- driver implementation coverage;
- driven-port adapter coverage;
- adapter ownership;
- suspicious object-graph construction outside composition;
- forbidden service-locator and mutable port configuration patterns.

Treat scanner failures as architectural defects. If an existing application
fails, present the violations, propose a staged migration, and keep all new or
touched code compliant. Do not weaken the scanner to accommodate legacy code.

## Completion standard

Before handoff, verify:

- every cross-module call follows driven port → adapter → driver;
- every port has a concrete adapter or application implementation;
- translations happen at adapters;
- composition visibly contains the complete object graph;
- no business module knows another module's internal types;
- architecture scan, typecheck, and relevant tests pass.
