/*
  costs-service is a standalone Cost Manager microservice.
  It stores user costs, coordinates running total updates with users-service,
  and generates monthly reports with cache rules for past months.
*/

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// קודם כל טוענים את ה-.env כדי שהמשתנים יהיו מוכנים!
dotenv.config();

const pino = require("pino");
const Log = require("./models/log.model");
const costsRoutes = require("./routes/costs.routes");
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Create app and logger instances.
const app = express();
const logger = pino({ level: "info" });

// Read required settings.
const { PORT, MONGO_URI, USER_SERVICE_URL } = process.env;

// Enable JSON body parser.
app.use(express.json());

// Validate mandatory configuration variables.
if (!PORT || !MONGO_URI || !USER_SERVICE_URL) {
  logger.error("Missing required environment values: PORT, MONGO_URI, USER_SERVICE_URL");
  process.exit(1);
}

// Log every incoming request to logs collection.
app.use(async (req, res, next) => {
  // Build log payload for request-level logging.
  const payload = {
    method: req.method,
    url: req.originalUrl,
    message: "HTTP request received",
  };

  // Try to persist request log without blocking API.
  try {
    await Log.create(payload);
    logger.info(payload);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to write request log");
  }

  // Continue middleware chain.
  next();
});

// Mount costs/report routes under /api.
app.use("/api", costsRoutes);

// Return standard error object for unknown paths.
app.use((req, res) => {
  res.status(404).json({ id: 404, message: "Route not found" });
});

// Return standard internal error response.
app.use((error, req, res, next) => {
  logger.error({ error: error.message }, "Unhandled application error");
  res.status(500).json({ id: 500, message: "Internal server error" });
});

// Start service only after successful DB connection.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info("MongoDB connection established");
    app.listen(PORT, () => logger.info(`costs-service listening on ${PORT}`));
  })
  .catch((error) => {
    logger.error({ error: error.message }, "MongoDB connection failed");
    process.exit(1);
  });
