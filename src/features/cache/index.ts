import { Op } from "sequelize";
import { jnparse, jnstringify } from "@/shared";
import CacheEntry from "./model";

interface RedisCacheConfig {
  namespace: string;
  defaultTTLSeconds?: number;
}

interface MethodCacheOptions {
  timeToLiveSeconds?: number;
  customKeyGenerator?: (methodArgs: any[]) => string;
  skipCacheGet?: boolean;
  skipCacheSet?: boolean;
}

class RedisCache {
  private readonly cacheNamespace: string;
  private readonly defaultTTLSeconds: number;

  constructor(config: RedisCacheConfig) {
    this.cacheNamespace = config.namespace;
    this.defaultTTLSeconds = config.defaultTTLSeconds || 3600;
  }

  /**
   * Decorator to add caching to methods
   * @param {Object} methodOptions - Options for the cache
   * @param {number} [methodOptions.timeToLiveSeconds] - Time to live in seconds
   * @param {Function} [methodOptions.customKeyGenerator] - Custom key generator function
   * @returns {Function} Decorated method
   *
   * @example
   *
   * class MyService {
   *   @RedisCache.withCache()
   *   async myMethod(arg1: string, arg2: number) {
   *     return this.myMethod(arg1, arg2);
   *   }
   * }
   *
   */
  withCache(methodOptions: MethodCacheOptions = {}): Function {
    return function (
      target: any,
      methodName: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const _options: MethodCacheOptions = {
        timeToLiveSeconds: methodOptions.timeToLiveSeconds,
        skipCacheGet: methodOptions.skipCacheGet ?? false,
        skipCacheSet: methodOptions.skipCacheSet ?? false,
        customKeyGenerator: methodOptions.customKeyGenerator,
      };

      descriptor.value = async function (
        this: RedisCache,
        ...methodArgs: any[]
      ) {
        // Build cache key
        const keyPart = _options.customKeyGenerator
          ? _options.customKeyGenerator(methodArgs)
          : `${methodName}:${JSON.stringify(methodArgs)}`;
        const cacheKey = `${this.cacheNamespace}:${keyPart}`;

        try {
          // Try cache first if not skipped
          if (!_options.skipCacheGet) {
            const cachedResult = await this.getItem(cacheKey);
            if (cachedResult) return cachedResult;
          }

          // If not in cache, call original method
          // 'this' here correctly refers to the service instance
          const databaseResult = await originalMethod.apply(this, methodArgs);

          // Cache the result if successful
          if (
            !_options.skipCacheSet &&
            databaseResult &&
            !databaseResult.error
          ) {
            const ttl =
              _options.timeToLiveSeconds ?? this.defaultTTLSeconds;
            await this.setItem(cacheKey, databaseResult, ttl);
          }

          return databaseResult;
        } catch (error) {
          // Fallback to original method if cache fails
          return originalMethod.apply(this, methodArgs);
        }
      };

      return descriptor;
    };
  }

  async invalidateCache(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.cacheNamespace}:${pattern}`;
      const likePattern = fullPattern.replace(/\*/g, "%").replace(/\?/g, "_");
      await CacheEntry.destroy({
        where: {
          key: {
            [Op.like]: likePattern,
          },
        },
      });
    } catch (error) {
      console.error("Redis cache invalidation failed:", error);
    }
  }

  setItem(key: string, value: any, ttl?: number) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    const expiresAt =
      typeof ttl === "number"
        ? new Date(Date.now() + ttl * 1000)
        : new Date(Date.now() + this.defaultTTLSeconds * 1000);
    return CacheEntry.upsert({
      key: namespacedKey,
      value,
      expiresAt,
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt.getTime() <= Date.now()) {
      await CacheEntry.destroy({ where: { key: namespacedKey } });
      return null;
    }

    return entry.value as T;
  }

  setHKey(key: string, field: string, value: any, ttl?: number) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      const current =
        entry && entry.value && typeof entry.value === "object"
          ? (entry.value as Record<string, unknown>)
          : {};
      const updated = { ...current, [field]: value };
      const expiresAt =
        typeof ttl === "number" && entry?.expiresAt == null
          ? new Date(Date.now() + ttl * 1000)
          : entry?.expiresAt ?? null;

      await CacheEntry.upsert({
        key: namespacedKey,
        value: updated,
        expiresAt,
      });
    })();
  }

  getHKey(key: string, field: string) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt.getTime() <= Date.now()) return null;
      const map = entry.value as Record<string, unknown>;
      return map ? map[field] ?? null : null;
    })();
  }

  getHKeys(key: string) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      if (!entry) return {} as Record<string, unknown>;
      if (entry.expiresAt && entry.expiresAt.getTime() <= Date.now()) {
        return {} as Record<string, unknown>;
      }
      return entry.value as Record<string, unknown>;
    })();
  }

  setList(key: string, value: any, ttl?: number) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      const current = Array.isArray(entry?.value) ? (entry!.value as unknown[]) : [];
      const updated = [value, ...current];
      const expiresAt =
        typeof ttl === "number" && entry?.expiresAt == null
          ? new Date(Date.now() + ttl * 1000)
          : entry?.expiresAt ?? null;

      await CacheEntry.upsert({
        key: namespacedKey,
        value: updated,
        expiresAt,
      });
    })();
  }

  getList(key: string) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      if (!entry) return [] as unknown[];
      if (entry.expiresAt && entry.expiresAt.getTime() <= Date.now()) {
        return [] as unknown[];
      }
      const list = Array.isArray(entry.value) ? (entry.value as unknown[]) : [];
      return list.map((item) => jnstringify(item));
    })();
  }

  deleteItem(key: string) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return CacheEntry.destroy({ where: { key: namespacedKey } });
  }

  deleteHKey(key: string, field: string) {
    const namespacedKey = `${this.cacheNamespace}:${key}`;
    return (async () => {
      const entry = await CacheEntry.findOne({ where: { key: namespacedKey } });
      if (!entry) return;
      const current =
        entry.value && typeof entry.value === "object"
          ? (entry.value as Record<string, unknown>)
          : {};
      if (!(field in current)) return;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete current[field];

      if (Object.keys(current).length === 0) {
        await CacheEntry.destroy({ where: { key: namespacedKey } });
      } else {
        await CacheEntry.update(
          { value: current },
          { where: { key: namespacedKey } }
        );
      }
    })();
  }

  getPipeline() {
    // Pipeline is not supported in Postgres-backed cache; return null to avoid breaking callers.
    return null;
  }

  /**
   * Wraps an async function with caching logic.
   * @param fn The async function to wrap.
   * @param options Cache options.
   * @returns A new function with the same signature as fn, but with caching.
   */
  cacheWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: MethodCacheOptions = {},
  ): (...args: Parameters<T>) => Promise<any> {
    // const redisClient = this.redisClient;
    // const cacheNamespace = this.cacheNamespace;
    // const defaultTTL = this.defaultTTLSeconds;

    return async function (
      this: RedisCache,
      ...args: Parameters<T>
    ): Promise<any> {
      const keyPart = options.customKeyGenerator
        ? options.customKeyGenerator(args)
        : `${fn.name}:${JSON.stringify(args)}`;
      const cacheKey = `${this.cacheNamespace}:${keyPart}`;
      const ttl = options.timeToLiveSeconds || this.defaultTTLSeconds;

      try {
        if (!options.skipCacheGet) {
          const cachedResult = await this.getItem(cacheKey);
          if (cachedResult) return cachedResult;
        }

        const result = await fn(...args);

        if (!options.skipCacheSet && result && !result.error) {
          await this.setItem(cacheKey, result, ttl);
        }

        return result;
      } catch (error) {
        return fn(...args);
      }
    };
  }

  get defaultTTLMs() {
    return this.defaultTTLSeconds;
  }

  get namespace() {
    return this.cacheNamespace;
  }
}

export default RedisCache;
