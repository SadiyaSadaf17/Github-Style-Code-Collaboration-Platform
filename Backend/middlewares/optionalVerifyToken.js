import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

/**
 * Attaches req.user when a valid token is present; otherwise req.user is undefined.
 * Does not send 401 when the token is missing (use with public + private repo routes).
 */
export function optionalVerifyToken() {
  return async (req, res, next) => {
    try {
      const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : null;
      const cookie = req.cookies?.token || null;
      const candidates = [bearer, cookie].filter(Boolean);

      if (!candidates.length) {
        req.user = null;
        return next();
      }

      for (const token of candidates) {
        try {
          req.user = jwt.verify(token, process.env.JWT_SECRET);
          return next();
        } catch {
          /* try next token */
        }
      }

      req.user = null;
      next();
    } catch {
      req.user = null;
      next();
    }
  };
}
