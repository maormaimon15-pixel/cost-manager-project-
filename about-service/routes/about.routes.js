const express = require("express");
const pino = require("pino");

// Create router and local logger.
const router = express.Router();
const logger = pino({ level: "info" });

// Build team array from MEMBER{N}_FIRST and MEMBER{N}_LAST env values.
function readTeamMembers() {
  // Initialize result array.
  const members = [];

  // Read members sequentially until no next index is defined.
  for (let i = 1; i <= 50; i += 1) {
    const first = process.env[`MEMBER${i}_FIRST`];
    const last = process.env[`MEMBER${i}_LAST`];
    if (!first && !last) break;
    if (!first || !last) throw new Error(`Missing MEMBER${i}_FIRST or MEMBER${i}_LAST`);
    members.push({ first_name: String(first).trim(), last_name: String(last).trim() });
  }

  // Ensure at least one member exists.
  if (members.length === 0) {
    throw new Error("No team members configured in .env");
  }

  // Return member objects with exact required fields.
  return members;
}

// GET /api/about - return team members from environment variables.
router.get("/about", async (req, res) => {
  // Log endpoint access locally to console using Pino.
  logger.info({ method: req.method, url: req.originalUrl, message: "Endpoint /api/about accessed" });

  // Basic query validation for strict endpoint contract.
  if (Object.keys(req.query).length > 0) {
    return res
      .status(400)
      .json({ id: 400, message: "Query parameters are not supported" });
  }

  // Build and return team response.
  try {
    const team = readTeamMembers();
    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ id: 500, message: error.message });
  }
});

module.exports = router;