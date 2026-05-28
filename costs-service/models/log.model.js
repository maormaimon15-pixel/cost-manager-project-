const mongoose = require("mongoose");

// Define schema for shared logs collection entries.
const logSchema = new mongoose.Schema(
  {
    // Record creation timestamp.
    timestamp: { type: Date, default: Date.now },
    // HTTP method for request/event.
    method: { type: String, required: true, trim: true },
    // URL for request/event.
    url: { type: String, required: true, trim: true },
    // Event message.
    message: { type: String, required: true, trim: true },
  },
  {
    // Keep payload output minimal.
    versionKey: false,
  }
);

// Export model as required name: Log.
module.exports = mongoose.model("Log", logSchema);
