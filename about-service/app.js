/*
  about-service is a standalone Cost Manager microservice.
  It returns developer team names from environment variables.
  This service is fully decoupled from the database.
*/

const express = require("express");
const dotenv = require("dotenv");
const pino = require("pino");
const aboutRoutes = require("./routes/about.routes");

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Load service configuration from .env.
dotenv.config();

// Create app and logger instances.
const app = express();
const logger = pino({ level: "info" });

// Read required configuration values from environment.
const { PORT } = process.env;

// Enable JSON body parsing middleware.
app.use(express.json());

// Validate mandatory startup environment variables.
if (!PORT) {
  logger.error("Missing required environment value: PORT");
  process.exit(1);
}

// Log every incoming request via Pino console locally (No DB connection here).
app.use((req, res, next) => {
  // Build request log entry payload.
  const payload = {
    method: req.method,
    url: req.originalUrl,
    message: "HTTP request received locally in about-service",
  };

  // Log locally using Pino console.
  logger.info(payload);

  // Continue request processing.
  next();
});

// Mount about API routes under /api.
app.use("/api", aboutRoutes);

// Return standard error object for unknown routes.
app.use((req, res) => {
  res.status(404).json({ id: 404, message: "Route not found" });
});

// Handle unexpected errors with standard format.
app.use((error, req, res, next) => {
  logger.error({ error: error.message }, "Unhandled application error");
  res.status(500).json({ id: 500, message: "Internal server error" });
});

// Start the standalone service immediately without DB dependency.
app.listen(PORT, () => logger.info(`about-service listening on ${PORT}`));