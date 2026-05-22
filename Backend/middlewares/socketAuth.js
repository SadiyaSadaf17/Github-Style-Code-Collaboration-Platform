import jwt from "jsonwebtoken";

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    out[key] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

export function socketAuthMiddleware(socket, next) {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const handshakeToken = socket.handshake.auth?.token;
    const token = handshakeToken || cookies.token;

    if (!token) {
      socket.data.userId = null;
      socket.data.role = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId?.toString?.() || String(decoded.userId);
    socket.data.role = decoded.role;
    next();
  } catch {
    socket.data.userId = null;
    socket.data.role = null;
    next();
  }
}
