/**
 * Lightweight probe functions for the services this product depends on.
 *
 * Each probe should be the cheapest possible verification:
 * - No side effects
 * - Minimal data transfer
 * - Fast timeout
 *
 * Platform capability checks use free status and model-list calls only —
 * never a paid call.
 */

import { pramaanFromEnv } from "@business-operations/pramaan";
import { checkHealth as checkCacheHealth } from "@business-operations/cache/health";
import { checkHealth as checkDbHealth } from "@business-operations/db/utils/health";
import type { Dependency } from "./registry";

// ---------------------------------------------------------------------------
// Tier 1 — Core infrastructure (app breaks without these)
// ---------------------------------------------------------------------------

/** Database: SELECT 1 via the existing @business-operations/db health utility */
export function databaseProbe(): Dependency {
  return {
    name: "database",
    tier: 1,
    cacheTtlMs: 30_000,
    timeoutMs: 3_000,
    probe: async () => {
      await checkDbHealth();
      return true;
    },
  };
}

/** Redis cache: PING via the existing @business-operations/cache health utility */
export function redisCacheProbe(): Dependency {
  return {
    name: "redis_cache",
    tier: 1,
    cacheTtlMs: 30_000,
    timeoutMs: 3_000,
    probe: async () => {
      await checkCacheHealth();
      return true;
    },
  };
}

/** Redis queue: PING using Bun's RedisClient */
export function redisQueueProbe(): Dependency {
  const { RedisClient } = require("bun");

  return {
    name: "redis_queue",
    tier: 1,
    cacheTtlMs: 30_000,
    timeoutMs: 3_000,
    probe: async () => {
      const url = process.env.REDIS_QUEUE_URL || process.env.REDIS_URL;
      if (!url) throw new Error("REDIS_QUEUE_URL not set");

      const client = new RedisClient(url, { connectionTimeout: 3000 });
      await client.connect();
      await client.send("PING", []);
      client.close();
      return true;
    },
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — The platform (free estimates only)
// ---------------------------------------------------------------------------

function pramaanProbe(
  name: string,
  call: (pramaan: NonNullable<ReturnType<typeof pramaanFromEnv>>) => Promise<unknown>,
): Dependency {
  return {
    name,
    tier: 2,
    cacheTtlMs: 60_000,
    timeoutMs: 5_000,
    probe: async () => {
      const pramaan = pramaanFromEnv();
      if (!pramaan) return false;
      await call(pramaan);
      return true;
    },
  };
}

/** Email delivery status: free estimate */
export function emailProbe(): Dependency {
  return pramaanProbe("email", (pramaan) => pramaan.capabilities.estimate("email.status", { ref: `ref_${"0".repeat(26)}` }));
}

/** SMS delivery status: free estimate */
export function smsProbe(): Dependency {
  return pramaanProbe("sms", (pramaan) => pramaan.capabilities.estimate("sms.status", { ref: `ref_${"0".repeat(26)}` }));
}

/** Generation models: free estimate */
export function modelsProbe(): Dependency {
  return pramaanProbe("models", (pramaan) =>
    pramaan.capabilities.estimate("llm.chat", { messages: [{ role: "user", content: "Status check" }], maxTokens: 64 }),
  );
}

// ---------------------------------------------------------------------------
// Pre-built registry sets for each service
// ---------------------------------------------------------------------------

/** Dependencies used by the API service */
export function apiDependencies(): Dependency[] {
  return [
    // Tier 1 — Core
    databaseProbe(),
    redisCacheProbe(),
    redisQueueProbe(),
    // Tier 2 — Platform (free calls)
    emailProbe(),
    smsProbe(),
    modelsProbe(),
  ];
}

/** Dependencies used by the Worker service */
export function workerDependencies(): Dependency[] {
  return [
    // Tier 1 — Core
    databaseProbe(),
    redisQueueProbe(),
    // Tier 2 — Platform (free calls)
    emailProbe(),
    smsProbe(),
    modelsProbe(),
  ];
}
