const express = require("express");
const pino = require("pino");
const User = require("../models/user.model");
const Log = require("../models/log.model");

// Create router and logger instances.
const router = express.Router();
const logger = pino({ level: "info" });

// Validate create-user request body.
function validateCreateUserBody(body) {
  // Ensure all required fields are present.
  if (
    body.id === undefined ||
    body.first_name === undefined ||
    body.last_name === undefined ||
    body.birthday === undefined
  ) {
    return "Missing required fields: id, first_name, last_name, birthday";
  }

  // Validate id type.
  if (typeof body.id !== "number" || Number.isNaN(body.id)) {
    return "Field 'id' must be a Number";
  }

  // Validate first_name type and non-empty value.
  if (typeof body.first_name !== "string" || body.first_name.trim() === "") {
    return "Field 'first_name' must be a non-empty String";
  }

  // Validate last_name type and non-empty value.
  if (typeof body.last_name !== "string" || body.last_name.trim() === "") {
    return "Field 'last_name' must be a non-empty String";
  }

  // Validate birthday parseability.
  if (Number.isNaN(new Date(body.birthday).getTime())) {
    return "Field 'birthday' must be a valid Date";
  }

  // Return null when payload is valid.
  return null;
}

// Validate addtotal request body.
function validateAddTotalBody(body) {
  // Ensure required sum field exists.
  if (body.sum === undefined) {
    return "Missing required field: sum";
  }

  // Validate sum numeric type.
  if (typeof body.sum !== "number" || Number.isNaN(body.sum)) {
    return "Field 'sum' must be a Number";
  }

  // Return null when payload is valid.
  return null;
}

// Persist endpoint-access logs in logs collection.
async function logEndpointAccess(req, message) {
  // Build endpoint access payload.
  const payload = { method: req.method, url: req.originalUrl, message };

  // Try to store endpoint access information.
  try {
    await Log.create(payload);
    logger.info(payload);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to write endpoint log");
  }
}

// POST /api/add - create user document.
router.post("/add", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/add accessed");

  // Validate request body.
  const validationError = validateCreateUserBody(req.body);
  if (validationError) {
    return res.status(400).json({ id: 400, message: validationError });
  }

  // Check duplicates and create user.
  try {
    const existing = await User.findOne({ id: req.body.id });
    if (existing) {
      return res
        .status(409)
        .json({ id: 409, message: "User with this id already exists" });
    }

    const user = await User.create({
      id: req.body.id,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      birthday: req.body.birthday,
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ id: 500, message: "Failed to create user" });
  }
});

// GET /api/users - fetch all users.
router.get("/users", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/users accessed");

  // Basic query validation for strict contract.
  if (Object.keys(req.query).length > 0) {
    return res
      .status(400)
      .json({ id: 400, message: "Query parameters are not supported" });
  }

  // Read and return all user documents.
  try {
    const users = await User.find({});
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ id: 500, message: "Failed to fetch users" });
  }
});

// GET /api/users/:id - fetch one user's required subset.
router.get("/users/:id", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/users/:id accessed");

  // Validate id path parameter.
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ id: 400, message: "Path 'id' must be Number" });
  }

  // Find user and return required shape.
  try {
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ id: 404, message: "User not found" });
    }

    return res.status(200).json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total: user.total,
    });
  } catch (error) {
    return res.status(500).json({ id: 500, message: "Failed to fetch user" });
  }
});

// POST /api/users/:id/addtotal - internal incremental total update.
router.post("/users/:id/addtotal", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/users/:id/addtotal accessed");

  // Validate user id path parameter.
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ id: 400, message: "Path 'id' must be Number" });
  }

  // Validate body payload.
  const validationError = validateAddTotalBody(req.body);
  if (validationError) {
    return res.status(400).json({ id: 400, message: validationError });
  }

  /*
    Computed Pattern (incremental running total):
    costs-service calls this internal endpoint every time a new cost is added.
    We update the stored aggregate in O(1) using $inc and never recalculate
    the total from all cost documents.
  */
  try {
    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $inc: { total: req.body.sum } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ id: 404, message: "User not found" });
    }
    return res.status(200).json(updated);
  } catch (error) {
    return res
      .status(500)
      .json({ id: 500, message: "Failed to update user total" });
  }
});

module.exports = router;
