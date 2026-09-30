# TypeScript DDD and hexagonal architecture

## Contract direction

A driver is the public capability a module offers. Define it in the provider's
`domain/driver.ts`. Implement it in the provider's application layer.

A driven port is a capability a module needs. Define it in the consumer's
`domain/driven.ts`. Implement it in that consumer's `adapters/` folder.

The consumer owns translation because the consumer owns the meaning it needs.
The provider must not learn the consumer's domain vocabulary.

## Canonical cross-module flow

```text
operations/application
        │ depends on
        ▼
OperationsCachePort
        ▲ implemented by
        │
operations/adapters/cache.ts
        │ calls
        ▼
CacheDriver
        ▲ implemented by
        │
cache/application/cacheDriver.ts
```

Only `operations/adapters/cache.ts` crosses the module boundary. Composition
constructs both implementations and connects them.

## Driver example

```ts
// Defines cache capabilities offered outside its boundary.
// Keeps cache application details private.

import type { CacheRequest, CacheResult } from './types';

/**
 * Offers cache operations to composed consumers.
 * Purpose: Publish cache-owned application capabilities.
 */
export interface CacheDriver {
  readOperation(input: CacheRequest): Promise<CacheResult>;
}
```

```ts
// Implements the cache module's public driver.
// Keeps business behavior inside cache application ownership.

import type { CacheDriver } from '../domain/driver';
import type { CacheStorePort } from '../domain/driven';

/** Dependencies required by cache application behavior. */
export interface CacheDriverDependencies {
  store: CacheStorePort;
}

/**
 * Builds the cache module's public driver.
 *
 * Purpose: Bind cache behavior to required ports.
 *
 * @param dependencies Cache capabilities supplied by composition.
 * @returns Cache capabilities exposed to composed consumers.
 */
export function createCacheDriver(
  dependencies: CacheDriverDependencies,
): CacheDriver {
  // Implement the public contract through local behavior.
  return {
    readOperation: async (input) => dependencies.store.read(input),
  };
}
```

## Driven port and adapter example

```ts
// Defines capabilities required by operations.
// Uses only operations-owned domain language.

import type {
  OperationCacheResult,
  OperationRequest,
} from './types';

/**
 * Supplies cache behavior required by operations.
 * Purpose: Invert the cache dependency.
 */
export interface OperationsCachePort {
  read(input: OperationRequest): Promise<OperationCacheResult>;
}
```

```ts
// Adapts cache capabilities into operations language.
// Owns every cross-context data translation.

import type { CacheDriver } from '../../cache/domain/driver';
import type { OperationsCachePort } from '../domain/driven';
import {
  mapCacheResult,
  mapOperationRequest,
} from './cache/mapping';

/**
 * Builds the operations-owned cache adapter.
 *
 * Purpose: Translate operations needs into cache calls.
 *
 * @param cache Public cache capability supplied by composition.
 * @returns Cache port expressed in operations language.
 */
export function createOperationsCacheAdapter(
  cache: CacheDriver,
): OperationsCachePort {
  // Translate both sides at the bounded-context edge.
  return {
    read: async (input) => {
      const result = await cache.readOperation(mapOperationRequest(input));
      return mapCacheResult(result);
    },
  };
}
```

## Composition example

```ts
// Constructs the application's complete dependency graph.
// Keeps module wiring explicit and centralized.

import { createCacheDriver } from './modules/cache/application/cacheDriver';
import { createOperationsCacheAdapter } from './modules/operations/adapters/cache';
import { createOperationsDriver } from './modules/operations/application/operationsDriver';
import { createCacheStoreAdapter } from './modules/cache/adapters/store';
import { database } from './infrastructure/database';

// Construct provider infrastructure and its adapter.
const cacheStore = createCacheStoreAdapter(database);

// Construct the provider's public application driver.
export const cache = createCacheDriver({ store: cacheStore });

// Translate the provider driver into consumer language.
const operationsCache = createOperationsCacheAdapter(cache);

// Construct the consumer with its own driven port.
export const operations = createOperationsDriver({
  cache: operationsCache,
});
```

## Layer permissions

| Source | Allowed internal dependencies |
|---|---|
| `core/` | `core/`, packages |
| root `infrastructure/` | `core/`, generated clients, root infrastructure, packages |
| module `domain/` | same module `domain/` |
| module `application/` | same module `domain/`, application, `core/` |
| module `adapters/` | own domain, adapters, infrastructure, generated clients, `core/` |
| module `infrastructure/` | own domain, infrastructure, generated clients, `core/`, packages |
| module `interface/` | own `domain/driver.ts`, interface, `core/`, packages |
| `composition.ts` | all constructors and contracts needed for wiring |
| `index.ts` | composition exports, interfaces, core lifecycle |

An adapter gains one additional permission: it may import another module's
`domain/driver.ts`. No other cross-module import is valid.

Top-level `adapters/<capability>.ts` files implement driven ports. Place larger
adapter-owned mapping details in `adapters/<capability>/` support folders.

## Infrastructure distinction

Root infrastructure owns application-wide external clients: database handles,
Redis connections, HTTP clients, clocks, identifiers, and configuration-backed
SDK clients. It contains no business rules and imports no modules.

Module infrastructure owns technology-specific runtime mechanisms belonging to
one bounded context, such as its queue worker or webhook runtime. It remains
behind that module's adapters and never becomes another module's dependency.

## Prohibited shortcuts

- Do not import foreign domain entities for convenience.
- Do not publish application service implementations.
- Do not instantiate adapters inside application services.
- Do not configure ports through mutable module globals.
- Do not resolve dependencies through a container inside business code.
- Do not make one universal shared-domain folder.
- Do not let persistence models become domain models.
- Do not pass provider DTOs through a consumer unchanged.
- Do not call foreign drivers directly from consumer application code.
- Do not place cross-module orchestration outside composition.

## Testing

Test domain and application behavior with driven-port fakes expressed in the
module's own language. Test adapters separately for mapping and delegation.
Test composition with a smoke test that constructs the complete object graph.

Do not import another module's test fixtures into a module unit test. Shared
integration fixtures belong outside module unit-test folders.
