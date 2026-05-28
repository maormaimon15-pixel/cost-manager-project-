const mongoose = require("mongoose");

// Define schema for logs collection used by pino middleware.
const logSchema = new mongoose.Schema(
  {
    // Creation timestamp of log entry.
    timestamp: { type: Date, default: Date.now },
    // HTTP method for the event.
    method: { type: String, required: true, trim: true },
    // URL for the event.
    url: { type: String, required: true, trim: true },
    // Message describing the event.
    message: { type: String, required: true, trim: true },
  },
  {
    // Omit __v for clean responses.
    versionKey: false,
  }
);

// Export model with required name: Log.
module.exports = mongoose.model("Log", logSchema);
