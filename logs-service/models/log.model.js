const mongoose = require("mongoose");

// Define schema for logs collection documents.
const logSchema = new mongoose.Schema(
  {
    // Timestamp defaults to document creation time.
    timestamp: { type: Date, default: Date.now },
    // HTTP method captured from request/event.
    method: { type: String, required: true, trim: true },
    // URL captured from request/event.
    url: { type: String, required: true, trim: true },
    // Human-readable description of the event.
    message: { type: String, required: true, trim: true },
  },
  {
    // Omit __v to keep API payloads cleaner.
    versionKey: false,
  }
);

// Export model as required name: Log.
module.exports = mongoose.model("Log", logSchema);
