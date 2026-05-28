/*
  users-service is a standalone Cost Manager microservice.
  It manages user creation and retrieval and exposes an internal
  endpoint to increment each user's running total.
*/

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const pino = require("pino");
const Log = require("./models/log.model");
const usersRoutes = require("./routes/users.routes");
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
// Load environment values from .env.
dotenv.config();

// Create app and logger instances.
const app = express();
const logger = pino({ level: "info" });

// Read required configuration values.
const { PORT, MONGO_URI } = process.env;

// Enable JSON body parsing middleware.
app.use(express.json());

// Validate mandatory startup environment variables.
if (!PORT || !MONGO_URI) {
  logger.error("Missing required environment values: PORT and/or MONGO_URI");
  process.exit(1);
}

// Log every incoming request to logs collection.
app.use(async (req, res, next) => {
  // Build request log entry payload.
  const payload = {
    method: req.method,
    url: req.originalUrl,
    message: "HTTP request received",
  };

  // Persist request log while preserving API availability.
  try {
    await Log.create(payload);
    logger.info(payload);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to write request log");
  }

  // Continue request processing.
  next();
});

// Mount users API routes under /api.
app.use("/api", usersRoutes);

// Return standard error object for unknown routes.
app.use((req, res) => {
  res.status(404).json({ id: 404, message: "Route not found" });
});

// Handle unexpected errors with standard format.
app.use((error, req, res, next) => {
  logger.error({ error: error.message }, "Unhandled application error");
  res.status(500).json({ id: 500, message: "Internal server error" });
});

// Connect to MongoDB Atlas and start service.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info("MongoDB connection established");
    app.listen(PORT, () => logger.info(`users-service listening on ${PORT}`));
  })
  .catch((error) => {
    logger.error({ error: error.message }, "MongoDB connection failed");
    process.exit(1);
  });
