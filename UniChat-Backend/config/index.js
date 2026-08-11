require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT, 10) || 9121,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/UniChatDataBase",
  jwtSecret: process.env.JWT_SECRET || "unichat-super-secret-jwt-key-2024",
  nodeEnv: process.env.NODE_ENV || "development",

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || "unichat:",
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3,
    enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== "false",
  },

  bullmq: {
    prefix: process.env.BULLMQ_PREFIX || "unichat",
    redisPort: parseInt(process.env.REDIS_PORT, 10) || 6379,
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPassword: process.env.REDIS_PASSWORD || null,
  },

  search: {
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS, 10) || 100,
    defaultLimit: parseInt(process.env.SEARCH_DEFAULT_LIMIT, 10) || 50,
    highlightMaxLength: parseInt(process.env.SEARCH_HIGHLIGHT_LENGTH, 10) || 200,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    message: "Too many requests from this IP, please try again later.",
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 100 * 1024 * 1024,
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || "image/jpeg,image/png,image/gif,image/webp,video/mp4,audio/webm,application/pdf").split(","),
  },

  notification: {
    pushEnabled: process.env.PUSH_ENABLED === "true",
    fcmServerKey: process.env.FCM_SERVER_KEY || "",
    fcmSenderId: process.env.FCM_SENDER_ID || "",
  },

  server: {
    name: process.env.SERVER_NAME || "UniChat",
    version: process.env.SERVER_VERSION || "1.0.0",
  },
};

module.exports = config;