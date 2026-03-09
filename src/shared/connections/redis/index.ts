import { config } from "@/shared";
import { Redis } from "@upstash/redis";

import { REDIS_CONNECTION_NAMES } from "@/shared";

type RedisConnectionName =
  (typeof REDIS_CONNECTION_NAMES)[keyof typeof REDIS_CONNECTION_NAMES];

const redisConnections: Partial<Record<RedisConnectionName, Redis>> = {};

export const getRedisConnections = () => redisConnections;

const connect = (name: RedisConnectionName) => {
  return new Redis({
    url: config.redis[name].url,
    token: config.redis[name].token,
  });
};

export async function disconnectRedisConnections() {
  const disconnecting: Array<Promise<unknown>> = [];
  for (const name of Object.keys(redisConnections) as RedisConnectionName[]) {
    const client = redisConnections[name];
    if (client && typeof (client as any).close === "function") {
      disconnecting.push((client as any).close());
    }
  }
  return Promise.all(disconnecting);
}

export function getRedisConnection(
  name: RedisConnectionName = REDIS_CONNECTION_NAMES.Default,
) {
  if (redisConnections[name]) {
    return redisConnections[name]!;
  }
  if (!config.redis[name]) {
    throw new Error(`Redis connection not exists: ${name}`);
  }
  redisConnections[name] = connect(name);
  return redisConnections[name]!;
}
