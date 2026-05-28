const mongoose = require("mongoose");

// Define schema for cached monthly report documents.
const reportSchema = new mongoose.Schema(
  {
    // Custom user id.
    userid: { type: Number, required: true },
    // Report year.
    year: { type: Number, required: true },
    // Report month.
    month: { type: Number, required: true },
    // Precomputed category-based report body.
    costs: { type: Array, required: true },
  },
  {
    // Omit __v from report responses.
    versionKey: false,
  }
);

// Prevent duplicate cache records for same user-month.
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

// Export model with required name: Report.
module.exports = mongoose.model("Report", reportSchema);
