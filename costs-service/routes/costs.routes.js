const express = require("express");
const pino = require("pino");
const Cost = require("../models/cost.model");
const Report = require("../models/report.model");
const Log = require("../models/log.model");

// Create router and logger instances.
const router = express.Router();
const logger = pino({ level: "info" });

// Keep fixed category order for final report output matching the teacher's exact JSON case.
const categoryOrder = ["food", "education", "health", "housing", "Sport"];

// Read users-service base URL from environment.
const { USER_SERVICE_URL } = process.env;

// Validate request body for POST /api/add.
function validateAddBody(body) {
  // Ensure required fields exist.
  if (
    body.userid === undefined ||
    body.description === undefined ||
    body.category === undefined ||
    body.sum === undefined
  ) {
    return "Missing required fields: userid, description, category, sum";
  }

  // Validate userid type.
  if (typeof body.userid !== "number" || Number.isNaN(body.userid)) {
    return "Field 'userid' must be a Number";
  }

  // Validate description.
  if (typeof body.description !== "string" || body.description.trim() === "") {
    return "Field 'description' must be a non-empty String";
  }

  // Validate category membership.
  if (!["food", "health", "housing", "sports", "education"].includes(body.category)) {
    return "Field 'category' must be one of food, health, housing, sports, education";
  }

  // Validate sum type/value.
  if (typeof body.sum !== "number" || Number.isNaN(body.sum) || body.sum <= 0) {
    return "Field 'sum' must be a positive Number";
  }

  // Validate optional date.
  if (body.date !== undefined && Number.isNaN(new Date(body.date).getTime())) {
    return "Field 'date' must be a valid Date";
  }

  // Return null when body is valid.
  return null;
}

// Validate and parse GET /api/report query values.
function parseReportQuery(query) {
  // Check required query parameters.
  if (query.id === undefined || query.year === undefined || query.month === undefined) {
    return "Missing required query parameters: id, year, month";
  }

  // Parse numeric query values.
  const userid = Number(query.id);
  const year = Number(query.year);
  const month = Number(query.month);

  // Validate numeric conversion and allowed month range.
  if (Number.isNaN(userid) || Number.isNaN(year) || Number.isNaN(month)) {
    return "Query parameters id, year, month must be numeric";
  }
  if (month < 1 || month > 12) {
    return "Query parameter 'month' must be between 1 and 12";
  }

  // Return parsed values.
  return { userid, year, month };
}

// Store endpoint access logs in logs collection.
async function logEndpointAccess(req, message) {
  // Build endpoint access payload.
  const payload = { method: req.method, url: req.originalUrl, message };

  // Persist endpoint event log.
  try {
    await Log.create(payload);
    logger.info(payload);
  } catch (error) {
    logger.error({ error: error.message }, "Failed to write endpoint log");
  }
}

// Call users-service to verify user exists.
async function verifyUserExists(userid) {
  // Call users-service user endpoint.
  const response = await fetch(`${USER_SERVICE_URL}/api/users/${userid}`);

  // Return true only for successful user lookup.
  return response.ok;
}

// Call users-service to increment running total.
async function incrementUserTotal(userid, sum) {
  // Call internal addtotal endpoint.
  const response = await fetch(`${USER_SERVICE_URL}/api/users/${userid}/addtotal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sum }),
  });

  // Throw for non-success responses.
  if (!response.ok) {
    throw new Error("Failed to increment user total");
  }
}

// Build report object with all five categories always present.
function buildReport(userid, year, month, costs) {
  // Initialize every category list including 'Sport' with proper casing.
  const grouped = {
    food: [],
    education: [],
    health: [],
    housing: [],
    Sport: [],
  };

  // Push each cost into its category list.
  costs.forEach((item) => {
    // Dynamically map the database key 'sports' to the output contract key 'Sport'.
    const targetCategory = item.category === "sports" ? "Sport" : item.category;

    if (grouped[targetCategory]) {
      grouped[targetCategory].push({
        sum: item.sum,
        description: item.description,
        day: new Date(item.date).getDate(),
      });
    }
  });

  // Build final costs array in exact required order.
  const reportCosts = categoryOrder.map((name) => ({ [name]: grouped[name] }));

  // Return final report shape.
  return { userid, year, month, costs: reportCosts };
}

// Query costs for one user and target month/year.
async function buildLiveMonthlyReport(userid, year, month) {
  // Compute inclusive month start and exclusive month end.
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  // Fetch costs in date window.
  const costs = await Cost.find({
    userid,
    date: { $gte: start, $lt: end },
  });

  // Build and return required report payload.
  return buildReport(userid, year, month, costs);
}

// POST /api/add - add new cost and update user running total.
router.post("/add", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/add accessed");

  // Validate request body.
  const validationError = validateAddBody(req.body);
  if (validationError) {
    return res.status(400).json({ id: 400, message: validationError });
  }

  // Verify user exists, save cost, then increment total.
  try {
    const userExists = await verifyUserExists(req.body.userid);
    if (!userExists) {
      return res.status(404).json({ id: 404, message: "User not found" });
    }

    const cost = await Cost.create({
      userid: req.body.userid,
      description: req.body.description,
      category: req.body.category,
      sum: req.body.sum,
      date: req.body.date || undefined,
    });

    await incrementUserTotal(req.body.userid, req.body.sum);
    return res.status(201).json(cost);
  } catch (error) {
    return res.status(500).json({ id: 500, message: "Failed to add cost" });
  }
});

// GET /api/report?id=&year=&month= - fetch cached or live report.
router.get("/report", async (req, res) => {
  // Write endpoint access log.
  await logEndpointAccess(req, "Endpoint /api/report accessed");

  // Validate and parse query values.
  const parsed = parseReportQuery(req.query);
  if (typeof parsed === "string") {
    return res.status(400).json({ id: 400, message: parsed });
  }

  // Extract parsed query values.
  const { userid, year, month } = parsed;

  /*
    Computed Design Pattern (reports + totals):
    1) totals are updated incrementally by costs-service calling users-service
       internal addtotal endpoint after each cost insertion ($inc in users-service).
    2) report generation for PAST months uses cache in reports collection:
       - return cached report immediately if found.
       - if missing, compute from costs, store cache, then return.
       for CURRENT/FUTURE months, always query costs live and never cache.
  */
  try {
    // Determine whether requested year-month is in the past.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isPastMonth =
      year < currentYear || (year === currentYear && month < currentMonth);

    // For past month, check cache first.
    if (isPastMonth) {
      const cached = await Report.findOne({ userid, year, month });
      if (cached) {
        return res.status(200).json({
          userid: cached.userid,
          year: cached.year,
          month: cached.month,
          costs: cached.costs,
        });
      }

      const computed = await buildLiveMonthlyReport(userid, year, month);
      try {
        await Report.create(computed);
      } catch (cacheError) {
        logger.error({ error: cacheError.message }, "Failed to cache report");
      }
      return res.status(200).json(computed);
    }

    // For current/future month, return live report without caching.
    const live = await buildLiveMonthlyReport(userid, year, month);
    return res.status(200).json(live);
  } catch (error) {
    return res.status(500).json({ id: 500, message: "Failed to build report" });
  }
});

module.exports = router;