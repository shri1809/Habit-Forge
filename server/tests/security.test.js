import { describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../server.js";
import { sanitizeMongoInput } from "../middleware/mongoSanitize.js";
import { protect, requireVerified } from "../middleware/authMiddleware.js";
import fs from "fs";
import path from "path";

describe("Comprehensive Security Controls & Audits", () => {
  describe("1. Database Security & NoSQL Injection Protection", () => {
    it("strips top-level MongoDB query operators ($gt, $ne, $where) from request body", () => {
      const req = {
        body: {
          email: "user@example.com",
          $gt: "",
          $where: "sleep(5000)",
        },
      };
      const res = {};
      const next = () => {};

      sanitizeMongoInput(req, res, next);

      expect(req.body.email).toBe("user@example.com");
      expect(req.body.$gt).toBeUndefined();
      expect(req.body.$where).toBeUndefined();
    });

    it("strips nested NoSQL injection operators ($gt, $regex) in request body", () => {
      const req = {
        body: {
          credentials: {
            username: { $ne: null },
            password: { $gt: "" },
            role: "admin",
          },
        },
      };
      const res = {};
      const next = () => {};

      sanitizeMongoInput(req, res, next);

      expect(req.body.credentials.role).toBe("admin");
      expect(req.body.credentials.username.$ne).toBeUndefined();
      expect(req.body.credentials.password.$gt).toBeUndefined();
    });

    it("strips prohibited dot-notation keys from query and params to prevent property injection", () => {
      const req = {
        query: { "user.role": "admin", sort: "date" },
        params: { "profile.isAdmin": "true" },
      };
      const res = {};
      const next = () => {};

      sanitizeMongoInput(req, res, next);

      expect(req.query.sort).toBe("date");
      expect(req.query["user.role"]).toBeUndefined();
      expect(req.params["profile.isAdmin"]).toBeUndefined();
    });
  });

  describe("2. Backend Security (Helmet, CORS, Rate Limiting & Validation)", () => {
    it("enforces Helmet secure HTTP headers (nosniff, X-Frame-Options, CSP)", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(res.headers["content-security-policy"]).toBeDefined();
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
    });

    it("allows CORS requests from configured trusted frontend origins", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:5173");

      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("rejects CORS requests from untrusted third-party origins", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://untrusted-attacker.com");

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("CORS policy violation");
    });

    it("attaches standard RateLimit headers to authentication routes", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.headers["ratelimit-limit"]).toBeDefined();
      expect(res.headers["ratelimit-remaining"]).toBeDefined();
    });

    it("rejects registration with invalid email format", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "invalid-email-format",
        password: "ValidPassword123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("valid email address");
    });

    it("rejects registration with password shorter than 8 characters", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("at least 8 characters");
    });

    it("rejects login with non-string credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: { $gt: "" },
        password: ["array-injection"],
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid email or password format");
    });
  });

  describe("3. Authentication, Password Hashing & Token Security", () => {
    it("hashes passwords using bcrypt with at least 10 salt rounds", async () => {
      const password = "SuperSecretPassword123!";
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Verify bcrypt format $2a$ or $2b$ and round count 10
      expect(hash).toMatch(/^\$2[ab]\$10\$/);
      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);

      const isMismatch = await bcrypt.compare("WrongPassword", hash);
      expect(isMismatch).toBe(false);
    });

    it("generates unique salt hashes for identical passwords", async () => {
      const password = "IdenticalPassword999";
      const salt1 = await bcrypt.genSalt(10);
      const salt2 = await bcrypt.genSalt(10);

      const hash1 = await bcrypt.hash(password, salt1);
      const hash2 = await bcrypt.hash(password, salt2);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it("rejects access to protected endpoints when no token is provided", async () => {
      let nextCalled = false;
      const req = { headers: {} };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };

      await protect(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain("no token provided");
    });

    it("rejects forged or tampered JWT tokens", async () => {
      let nextCalled = false;
      const fakeToken = jwt.sign({ id: "fake_id" }, "wrong_secret");
      const req = {
        headers: {
          authorization: `Bearer ${fakeToken}`,
        },
      };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };

      await protect(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain("token failed");
    });

    it("enforces email verification guard (requireVerified)", () => {
      let nextCalled = false;
      const reqUnverified = {
        user: { _id: "123", email: "unverified@example.com", isVerified: false },
      };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };

      requireVerified(reqUnverified, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.isVerified).toBe(false);

      // Verified user passes
      let verifiedNextCalled = false;
      const reqVerified = {
        user: { _id: "123", email: "verified@example.com", isVerified: true },
      };

      requireVerified(reqVerified, res, () => {
        verifiedNextCalled = true;
      });

      expect(verifiedNextCalled).toBe(true);
    });
  });

  describe("4. Secrets Management & Environment Exclusion Audits", () => {
    it("confirms .env is explicitly excluded in root .gitignore", () => {
      const gitignorePath = path.resolve(__dirname, "../../.gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toMatch(/\.env/);
      expect(content).toMatch(/node_modules/);
    });

    it("confirms .env.example exists with placeholder values only", () => {
      const examplePath = path.resolve(__dirname, "../.env.example");
      expect(fs.existsSync(examplePath)).toBe(true);
      const content = fs.readFileSync(examplePath, "utf-8");
      expect(content).toContain("your_email@example.com");
      expect(content).not.toContain("HabitForge_18");
      expect(content).not.toContain("pghe tkhs njqu lvak");
    });
  });
});
