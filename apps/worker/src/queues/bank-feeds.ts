import { Queue } from "bullmq";
import { getRedisConnection } from "../config";
import type { QueueConfig } from "../types/queue-config";
export const bankFeedsQueueConfig: QueueConfig = {
  name: "bank-feeds",
  queueOptions: { connection: getRedisConnection(), defaultJobOptions: { attempts: 1, removeOnComplete: 100, removeOnFail: 100 } },
  workerOptions: { connection: getRedisConnection(), concurrency: 1 },
};
export const bankFeedsQueue = new Queue("bank-feeds", bankFeedsQueueConfig.queueOptions);
