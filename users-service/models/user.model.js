const mongoose = require("mongoose");

// Define schema for users collection with required fields.
const userSchema = new mongoose.Schema(
  {
    // Application-level custom numeric id (different from MongoDB _id).
    id: { type: Number, required: true, unique: true },
    // User first name.
    first_name: { type: String, required: true, trim: true },
    // User last name.
    last_name: { type: String, required: true, trim: true },
    // User birthday.
    birthday: { type: Date, required: true },
    // Running total maintained incrementally.
    total: { type: Number, default: 0 },
  },
  {
    // Keep API payloads concise.
    versionKey: false,
  }
);

// Export model as required name: User.
module.exports = mongoose.model("User", userSchema);
