/**
 * Standalone Node.js HTTP Server for WatsGo Creator Hub APIs.
 * Runs on port 5000 (or process.env.PORT) and serves:
 * 1. POST /api/register
 * 2. POST /api/login
 * 3. POST /api/verify-otp
 * 4. POST /api/resend-otp
 * 5. GET  /api/me
 * 6. GET  /api/health
 */

import http from "node:http";
import {
  registerCreator,
  loginCreator,
  verifyOtpCode,
  resendOtpCode,
  sendMobileOtp,
  getUserFromToken,
} from "./auth-service.js";

const PORT = parseInt(process.env.API_PORT || process.env.PORT || "9876", 10);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        // 1MB limit
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  try {
    // 1. Health check
    if (pathname === "/api/health" || pathname === "/health") {
      return sendJson(res, 200, {
        status: "ok",
        service: "WatsGo Creator Hub API",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. API 1: Register
    if (pathname === "/api/register" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const result = await registerCreator(body);
      return sendJson(res, 200, result);
    }

    // 3. API 2: Login
    if (pathname === "/api/login" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const result = await loginCreator(body);
      return sendJson(res, 200, result);
    }

    // 4. API 3: Verify OTP (supports /api/verify-otp, /api/verify-mobile-otp, /api/verify-otp-register)
    if (
      (pathname === "/api/verify-otp" ||
        pathname === "/api/verify-mobile-otp" ||
        pathname === "/api/verify-otp-register") &&
      req.method === "POST"
    ) {
      const body = await parseJsonBody(req);
      const result = await verifyOtpCode(body);
      return sendJson(res, 200, result);
    }

    // 5. Direct SMS OTP Dispatch
    if (pathname === "/api/send-mobile-otp" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const result = await sendMobileOtp(body);
      return sendJson(res, 200, result);
    }

    // 5. Resend OTP
    if (pathname === "/api/resend-otp" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const result = await resendOtpCode(body);
      return sendJson(res, 200, result);
    }

    // 6. User info from session token (/api/me)
    if (pathname === "/api/me" && req.method === "GET") {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const userSession = await getUserFromToken(token);
      if (!userSession) {
        return sendJson(res, 401, { success: false, message: "Unauthorized session" });
      }
      return sendJson(res, 200, { success: true, ...userSession });
    }

    // Route not found
    return sendJson(res, 404, { success: false, message: `Route not found: ${pathname}` });
  } catch (error) {
    console.error(`[API ERROR] ${pathname}:`, error.message);
    return sendJson(res, 400, {
      success: false,
      message: error.message || "An unexpected error occurred.",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 WatsGo Creator Hub API running on http://localhost:${PORT}`);
  console.log(`   - POST /api/register`);
  console.log(`   - POST /api/login`);
  console.log(`   - POST /api/verify-otp`);
  console.log(`   - POST /api/resend-otp`);
  console.log(`   - GET  /api/me`);
});
