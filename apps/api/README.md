# Business Operations API

Run the complete local stack with `./start` from the repository root. The launcher supplies local database, authentication, storage and Redis addresses. Only `PRAMAAN_API_KEY` is required from the operator.

For development, use `bun dev` in this package with the generated local environment. `bun start` runs the production API. All outside integrations use the single Pramaan client; tests use a fake.

The bundled Redis instance serves API caches and BullMQ queues. `REDIS_URL` selects the cache connection and `REDIS_QUEUE_URL` selects the queue connection. Both point to local Redis by default. Cache misses degrade gracefully; queued effects require explicit approval.

See the root README and DONE.md for ports, verification and optional features.
