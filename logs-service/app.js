/*
  logs-service is a standalone Cost Manager microservice.
  It stores request logs in MongoDB and exposes a retrieval endpoint
  for admin and testing purposes.
*/

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const pino = require("pino");
const Log = require("./models/log.model");
const logsRoutes = require("./routes/logs.routes");
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
// Load environment values from local .env file.
dotenv.config();

// Create app and logger instances.
const app = express();
const logger = pino({ level: "info" });

// Read required configuration variables.
const { PORT, MONGO_URI } = process.env;

// Enable JSON parsing middleware.
app.use(express.json());

// Validate mandatory configuration before startup.
if (!PORT || !MONGO_URI) {
  logger.error("Missing required environment values: PORT and/or MONGO_URI");
  process.exit(1);
}

// Log every incoming HTTP request into logs collection.
app.use(async (req, res, next) => {
  // Build the request log payload.
  const payload = {
    method: req.method,
    url: req.originalUrl,
    message: "HTTP request received",
  };

  // Persist request log while keeping request flow resilient.
  try {
    await Log.create(payload);
    logger.info(payload);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to write request log");
  }

  // Continue to next middleware/route.
  next();
});

// Mount logs endpoints under /api namespace.
app.use("/api", logsRoutes);

// Return project-standard error object for unknown routes.
app.use((req, res) => {
  res.status(404).json({ id: 404, message: "Route not found" });
});

// Return project-standard server error object.
app.use((error, req, res, next) => {
  logger.error({ error: error.message }, "Unhandled application error");
  res.status(500).json({ id: 500, message: "Internal server error" });
});

// Connect to MongoDB Atlas and start the standalone service.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info("MongoDB connection established");
    app.listen(PORT, () => logger.info(`logs-service listening on ${PORT}`));
  })
  .catch((error) => {
    logger.error({ error: error.message }, "MongoDB connection failed");
    process.exit(1);
  });
