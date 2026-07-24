/** Injection token for RedisService — breaks the common↔redis circular dependency */
export const REDIS_SERVICE = Symbol('REDIS_SERVICE')
