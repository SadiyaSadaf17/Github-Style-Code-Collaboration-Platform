import exp from "express";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import { cachedGlobalSearch } from "../services/searchService.js";
import { searchLimiter } from "../middlewares/rateLimiters.js";

export const searchRoute = exp.Router();

searchRoute.get("/", searchLimiter, optionalVerifyToken(), async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const typeParam = req.query.type || req.query.types || "";
    const types = typeParam
      ? String(typeParam)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const limit = Number(req.query.limit) || 15;

    const payload = await cachedGlobalSearch({
      q,
      types,
      userId: req.user?.userId,
      limit,
    });

    res.status(200).json({
      message: "search completed",
      query: q,
      payload,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default searchRoute;
