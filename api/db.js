/**
 * Database connection layer for WatsGo Creator Hub.
 * Supports MySQL/MariaDB with automatic fallback to local memory store
 * when live database credentials are not yet configured.
 */

import fs from "node:fs";
import path from "node:path";

// Parse .env manually if dotenv is not installed
function loadEnv() {
  try {
    const envPaths = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), "../.env"),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        content.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const [k, ...v] = trimmed.split("=");
            const key = k.trim();
            const val = v
              .join("=")
              .trim()
              .replace(/^['"]|['"]$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      }
    }
  } catch (err) {
    // Ignore error reading env
  }
}

loadEnv();

export const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watsgo_creators",
  jwtSecret: process.env.JWT_SECRET || "watsgo_production_secret_key_2026",
};

// In-Memory mock store fallback (ensures API always functions smoothly during testing)
export const memoryStore = {
  users: [
    {
      id: 1,
      full_name: "Priya Malhotra",
      email: "priya@email.com",
      mobile_number: "9876543210",
      // Default demo hash (Password: Password123!)
      password_hash:
        "7c69e4e80b6f776a64430400ca57d273a1324132673607eb45211711e4aad7a9a8861e01c1dfc84b0980ace416395ac10cd983a8394f878e4e3047ba04cbb8d0$7490d6997f8cac83279d00c33bc4b4a5",
      role: "creator",
      is_verified: 1,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  otps: [
    {
      id: 1,
      user_id: 1,
      identifier: "priya@email.com",
      otp_code: "482716",
      type: "registration",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString(),
    },
  ],
  sessions: [],
  creator_profiles: [
    {
      id: 1,
      user_id: 1,
      display_name: "Priya Moves",
      bio: "Lifestyle, mindful travel and everyday wellness.",
      country: "India",
      city: "Mumbai",
      preferred_language: "English",
      niche_categories: ["Lifestyle", "Travel"],
      onboarding_completed: 1,
      created_at: new Date().toISOString(),
    },
  ],
};

let mysqlPool = null;
let isMysqlActive = false;

// Attempt to dynamically load mysql2 if installed and configured
export async function getDbPool() {
  if (isMysqlActive && mysqlPool) return mysqlPool;
  if (process.env.DB_PASSWORD && process.env.DB_HOST) {
    try {
      const mysql = await import("mysql2/promise");
      mysqlPool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      // Test connection
      await mysqlPool.query("SELECT 1");
      isMysqlActive = true;
      console.log("✅ Connected to live MySQL database at", config.host);
      return mysqlPool;
    } catch (e) {
      // MySQL not reachable, use fallback
      console.warn(
        "⚠️ Could not connect to MySQL server (" +
          e.message +
          "). Using fallback mock store for now.",
      );
      isMysqlActive = false;
    }
  }
  return null;
}
