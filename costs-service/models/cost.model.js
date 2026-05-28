const mongoose = require("mongoose");

// Define the only valid category values.
const categories = ["food", "health", "housing", "sports", "education"];

// Define schema for costs collection documents.
const costSchema = new mongoose.Schema(
  {
    // Description of the purchased item/service.
    description: { type: String, required: true, trim: true },
    // Cost category constrained by project rules.
    category: { type: String, required: true, enum: categories, trim: true },
    // Custom user id (not ObjectId).
    userid: { type: Number, required: true },
    // Monetary amount.
    sum: { type: Number, required: true },
    // Date of cost record.
    date: { type: Date, default: Date.now },
  },
  {
    // Omit __v from responses.
    versionKey: false,
  }
);

// Export model with required name: Cost.
module.exports = mongoose.model("Cost", costSchema);
