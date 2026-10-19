import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import { sanitizeMongoInput } from "./middleware/mongoSanitize.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

// Connect to MongoDB (skip during test execution if handled by in-memory or mocked)
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

const app = express();

// HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "http://localhost:5173",
          "http://localhost:5000",
          "https://habit-forge-1r4b.onrender.com",
          "https://habit-forge-six-chi.vercel.app",
          process.env.CLIENT_URL,
        ].filter(Boolean),
      },
    },
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: "sameorigin" },
    referrerPolicy: { policy: "no-referrer" },
  })
);

// Allowed Origins Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://habit-forge-six-chi.vercel.app",
  "https://habit-forge-l6mnscsfu-web-app-f9b9.vercel.app",
  "https://habit-forge-1r4b.onrender.com",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/habit-forge.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Blocked by CORS policy"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-timezone",
      "X-User-Timezone",
    ],
  })
);

// Body Parser with strict payload limit to prevent large payload DoS
app.use(express.json({ limit: "50kb" }));

// NoSQL Injection sanitizer
app.use(sanitizeMongoInput);

// General rate limiter for all API endpoints
app.use("/api", apiLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);

// Root health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fallback error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ message: "CORS policy violation: Access denied for this origin." });
  }
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`HabitForge Server running on port ${PORT}`);
  });
}

export default app;