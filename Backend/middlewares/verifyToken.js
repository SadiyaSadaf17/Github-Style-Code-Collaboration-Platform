import jwt from "jsonwebtoken";

import { config } from "dotenv";

config();



export const verifyToken = (...allowedRoles) => {

  return async (req, res, next) => {

    try {

      // Read token from cookie or Authorization header
      const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

      if (!token) {

        return res.status(401).json({ message: "Unauthorized. Please login" });

      }



      // Verify and decode token

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);



      // Check if role is allowed

      if (!allowedRoles.includes(decodedToken.role)) {

        return res.status(403).json({ message: "Forbidden. You don't have permission" });

      }



      // Attach user info to req for use in routes

      req.user = decodedToken;



      next();

    } catch (err) {

      // jwt.verify throws if token is invalid/expired

      if (err.name === "TokenExpiredError") {

        return res.status(401).json({ message: "Session expired. Please login again" });

      }

      if (err.name === "JsonWebTokenError") {

        return res.status(401).json({ message: "Invalid token. Please login again" });

      }

     // next(err);

    }

  };

};