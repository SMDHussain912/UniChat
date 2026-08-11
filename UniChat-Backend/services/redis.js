const Redis = require("ioredis");
const config = require("../config");

let redisClient = null;
let redisPublisher = null;
let redisSubscriber = null;

function createRedisClient() {
  const { host, port, password, db, keyPrefix, maxRetriesPerRequest, enableReadyCheck } = config.redis;

  const client = new Redis({
    host,
    port,
    password,
    db,
    keyPrefix,
    maxRetriesPerRequest,
    enableReadyCheck,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ["ECONNREFUSED", "ETIMEDOUT"];
      return targetErrors.some(e => err.message.includes(e));
    },
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[Redis] Connected successfully");
  });

  client.on("close", () => {
    console.warn("[Redis] Connection closed");
  });

  return client;
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

function getRedisPublisher() {
  if (!redisPublisher) {
    redisPublisher = createRedisClient();
  }
  return redisPublisher;
}

function getRedisSubscriber() {
  if (!redisSubscriber) {
    redisSubscriber = createRedisClient();
    redisSubscriber.on("message", (channel, message) => {
      console.log(`[Redis Subscriber] Message on channel ${channel}`);
    });
  }
  return redisSubscriber;
}

async function ping() {
  const client = getRedisClient();
  return client.ping();
}

async function get(key) {
  const client = getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

async function set(key, value, ttlSeconds = 3600) {
  const client = getRedisClient();
  const serialized = JSON.stringify(value);
  await client.set(key, serialized, "EX", ttlSeconds);
}

async function del(key) {
  const client = getRedisClient();
  await client.del(key);
}

async function exists(key) {
  const client = getRedisClient();
  const result = await client.exists(key);
  return result === 1;
}

async function keys(pattern) {
  const client = getRedisClient();
  return client.keys(pattern);
}

async function incr(key) {
  const client = getRedisClient();
  return client.incr(key);
}

async function expire(key, ttlSeconds) {
  const client = getRedisClient();
  await client.expire(key, ttlSeconds);
}

async function publish(channel, message) {
  const publisher = getRedisPublisher();
  return publisher.publish(channel, JSON.stringify(message));
}

async function subscribe(channel, callback) {
  const subscriber = getRedisSubscriber();
  await subscriber.subscribe(channel);
  subscriber.on("message", (ch, msg) => {
    if (ch === channel) {
      try {
        callback(JSON.parse(msg));
      } catch (e) {
        console.error(`[Redis] Error parsing message for channel ${channel}:`, e.message);
      }
    }
  });
}

async function hget(key, field) {
  const client = getRedisClient();
  const value = await client.hget(key, field);
  return value ? JSON.parse(value) : null;
}

async function hset(key, field, value) {
  const client = getRedisClient();
  await client.hset(key, field, JSON.stringify(value));
}

async function hgetall(key) {
  const client = getRedisClient();
  const raw = await client.hgetall(key);
  const result = {};
  for (const [k, v] of Object.entries(raw)) {
    try {
      result[k] = JSON.parse(v);
    } catch {
      result[k] = v;
    }
  }
  return result;
}

async function flushDb() {
  const client = getRedisClient();
  await client.flushdb();
}

async function quit() {
  const client = getRedisClient();
  await client.quit();
  if (redisPublisher) await redisPublisher.quit();
  if (redisSubscriber) await redisSubscriber.quit();
  redisClient = null;
  redisPublisher = null;
  redisSubscriber = null;
}

const redisService = {
  getRedisClient,
  getRedisPublisher,
  getRedisSubscriber,
  ping,
  get,
  set,
  del,
  exists,
  keys,
  incr,
  expire,
  publish,
  subscribe,
  hget,
  hset,
  hgetall,
  flushDb,
  quit,
};

module.exports = redisService;