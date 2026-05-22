import winston from "winston";
import { mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, "..", "logs");

if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";
const logFile = process.env.LOG_FILE || join(logsDir, "app.log");

const formats = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const base = `${timestamp} [${level}] ${message}${extra}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: formats,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), formats),
    }),
    new winston.transports.File({
      filename: logFile,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: join(logsDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

export default logger;
