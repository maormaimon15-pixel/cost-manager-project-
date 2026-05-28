const mongoose = require("mongoose");

// Define schema for shared logs collection entries.
const logSchema = new mongoose.Schema(
  {
    // Creation timestamp for the log entry.
    timestamp: { type: Date, default: Date.now },
    // HTTP method for the request/event.
    method: { type: String, required: true, trim: true },
    // URL for the request/event.
    url: { type: String, required: true, trim: true },
    // Human-readable event message.
    message: { type: String, required: true, trim: true },
  },
  {
    // Keep output payload simple.
    versionKey: false,
  }
);

// Export model as required name: Log.
module.exports = mongoose.model("Log", logSchema);
