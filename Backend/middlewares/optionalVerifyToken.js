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
      const token =
        req.cookies?.token ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.substring(7)
          : null);

      if (!token) {
        req.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      req.user = null;
      next();
    }
  };
}
