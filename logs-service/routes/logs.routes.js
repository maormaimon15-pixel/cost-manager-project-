const express = require("express");
const pino = require("pino");
const Log = require("../models/log.model");

// Create router and service logger.
const router = express.Router();
const logger = pino({ level: "info" });

// GET /api/logs - return all logs from MongoDB.
router.get("/logs", async (req, res) => {
  // Reject unsupported query params for basic validation.
  if (Object.keys(req.query).length > 0) {
    return res
      .status(400)
      .json({ id: 400, message: "Query parameters are not supported" });
  }

  // Log endpoint access and fetch all log documents.
  try {
    await Log.create({
      method: req.method,
      url: req.originalUrl,
      message: "Endpoint /api/logs accessed",
    });
    const logs = await Log.find({}).sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to fetch logs");
    return res.status(500).json({ id: 500, message: "Failed to fetch logs" });
  }
});

module.exports = router;
