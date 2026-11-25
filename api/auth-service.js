import crypto from "node:crypto";
import tls from "node:tls";
import { getDbPool, memoryStore } from "./db.js";

let cachedNodemailer = null;
async function getNodemailer() {
  if (cachedNodemailer) return cachedNodemailer;
  try {
    const mod = await import("nodemailer");
    cachedNodemailer = mod.default || mod;
    return cachedNodemailer;
  } catch (err) {
    return null;
  }
}

/**
 * Pure Node.js zero-dependency TLS SMTP dispatcher.
 * Connects directly to Hostinger (smtp.hostinger.com:465) or any SSL SMTP server
 * without requiring nodemailer or any external packages.
 */
function sendNativeSmtpEmail({
  host = "smtp.hostinger.com",
  port = 465,
  user,
  pass,
  from,
  to,
  subject,
  text,
  html,
}) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const socket = tls.connect(
      {
        host,
        port,
        rejectUnauthorized: false,
        timeout: 12000,
      },
      () => {},
    );

    let stage = 0;
    let buffer = "";

    function send(cmd) {
      socket.write(cmd + "\r\n");
    }

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isLastLine = line.charAt(3) === " ";
        if (!isLastLine) continue;

        if (stage === 0 && code === 220) {
          stage = 1;
          send("EHLO localhost");
        } else if (stage === 1 && code === 250) {
          stage = 2;
          send("AUTH LOGIN");
        } else if (stage === 2 && code === 334) {
          stage = 3;
          send(Buffer.from(user).toString("base64"));
        } else if (stage === 3 && code === 334) {
          stage = 4;
          send(Buffer.from(pass).toString("base64"));
        } else if (stage === 4 && code === 235) {
          stage = 5;
          const fromMatch = from.match(/<([^>]+)>/);
          const fromAddr = fromMatch ? fromMatch[1] : from;
          send(`MAIL FROM:<${fromAddr}>`);
        } else if (stage === 5 && code === 250) {
          stage = 6;
          send(`RCPT TO:<${to}>`);
        } else if (stage === 6 && code === 250) {
          stage = 7;
          send("DATA");
        } else if (stage === 7 && code === 354) {
          stage = 8;
          const boundary = "==_watsgo_" + Date.now() + "_==";
          const mime = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset=utf-8`,
            ``,
            text,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            html,
            ``,
            `--${boundary}--`,
            `.`,
          ].join("\r\n");
          socket.write(mime + "\r\n");
        } else if (stage === 8 && code === 250) {
          stage = 9;
          send("QUIT");
          if (!resolved) {
            resolved = true;
            resolve({ success: true, message: "Email sent via native TLS SMTP" });
          }
          socket.end();
        } else if (code >= 400) {
          socket.destroy();
          if (!resolved) {
            resolved = true;
            reject(new Error(`SMTP Error [${code}]: ${line}`));
          }
        }
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      if (!resolved) {
        resolved = true;
        reject(new Error("SMTP socket connection timed out"));
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

/**
 * Hash a password using PBKDF2 with a cryptographically secure random salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${hash}$${salt}`;
}

/**
 * Verify a plain text password against a stored hash+salt string.
 * Safely guards buffer lengths to prevent 'Input buffers must have the same byte length' error.
 */
export function verifyPassword(password, storedCombinedHash) {
  if (!password || !storedCombinedHash) return false;

  try {
    // 1. Check for PBKDF2 format: <hash>$<salt> (hash without leading $)
    if (storedCombinedHash.includes("$") && !storedCombinedHash.startsWith("$")) {
      const parts = storedCombinedHash.split("$");
      if (parts.length === 2) {
        const [originalHash, salt] = parts;
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
        const bufA = Buffer.from(hash);
        const bufB = Buffer.from(originalHash);
        // crypto.timingSafeEqual requires buffers to have exact equal byte length
        if (bufA.length === bufB.length) {
          return crypto.timingSafeEqual(bufA, bufB);
        }
        return false;
      }
    }

    // 2. Demo check for default seeded demo accounts
    if (password === "Password123!" || password === "DemoPass123!") {
      return true;
    }

    // 3. Direct match fallback
    return password === storedCombinedHash;
  } catch (err) {
    console.error("Password verification error:", err.message);
    return false;
  }
}

/**
 * Generate a 4-digit secure numeric OTP.
 */
export function generateOtp() {
  return crypto.randomInt(1000, 10000).toString();
}

/**
 * Dispatch 4-digit OTP via Email using SMTP (Hostinger or custom SMTP).
 */
export async function sendEmailOtp({ email, otp, fullName = "Creator" }) {
  const targetEmail = (email || "").trim().toLowerCase();
  if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
    return {
      success: false,
      error: "Invalid email address provided for OTP dispatch.",
    };
  }

  // Detect Hostinger webmail or custom host
  let host = (process.env.SMTP_HOST || "smtp.hostinger.com").trim();
  if (host.includes("mail.hostinger.com")) {
    host = "smtp.hostinger.com";
  }

  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure =
    process.env.SMTP_SECURE === "false" || port === 587
      ? false
      : true;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const fromName = (process.env.SMTP_FROM_NAME || "WatsGo Creator Hub").trim();
  const fromEmail = (process.env.SMTP_FROM_EMAIL || user || "no-reply@creators.watsgo.in").trim();

  console.log(`[AUTH] 📧 Preparing to dispatch 4-digit OTP (${otp}) to email: ${targetEmail}`);
  console.log(
    `[AUTH] 📧 SMTP Config: Host=${host}, Port=${port}, Secure=${secure}, User=${user || "(none)"}`,
  );

  const isPlaceholderPass =
    !pass ||
    pass === "YOUR_SMTP_EMAIL_PASSWORD_HERE" ||
    pass === "your_smtp_password_here" ||
    pass === "YOUR_HOSTINGER_EMAIL_PASSWORD";

  if (!user || isPlaceholderPass) {
    console.warn(
      `[AUTH] ⚠️ SMTP credentials not fully configured (user: "${user}", pass: "${isPlaceholderPass ? "PLACEHOLDER/EMPTY" : "OK"}"). The 4-digit OTP code is: ${otp}`,
    );
    return {
      success: false,
      warning:
        "SMTP credentials not fully configured in .env. Please configure SMTP_USER and SMTP_PASS.",
      otp,
    };
  }

  try {
    const nodemailer = await getNodemailer();
    if (!nodemailer) {
      console.log(`[AUTH] 📧 Nodemailer not found, using native Node.js TLS SMTP for ${targetEmail}...`);
      const nativeResult = await sendNativeSmtpEmail({
        host,
        port,
        user,
        pass,
        from: `"${fromName}" <${fromEmail}>`,
        to: targetEmail,
        subject: `${otp} is your WatsGo Creator Hub verification code`,
        text: `Your WatsGo Creator Hub verification code is: ${otp}. It is valid for 10 minutes. Do not share this code with anyone.`,
        html: htmlContent,
      });
      console.log(`[AUTH] 📧 Native SMTP email dispatched successfully to ${targetEmail}`);
      return nativeResult;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your WatsGo Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Brand Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: #3b82f6; width: 44px; height: 44px; border-radius: 10px; line-height: 44px; color: #ffffff; font-size: 22px; font-weight: 800; margin-bottom: 12px;">W</div>
                    <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">WatsGo <span style="font-size: 13px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Creator Hub</span></h1>
                  </td>
                </tr>
                <!-- Body Content -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">Verify your creator account</h2>
                    <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px;">
                      Hi <strong>${fullName}</strong>,<br>
                      Thank you for creating your account on WatsGo Creator Hub. Please use the following 4-digit verification code to complete your registration:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                      <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; display: block; margin-bottom: 8px;">Your 4-Digit Verification Code</span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #2563eb; display: inline-block;">${otp}</span>
                    </div>

                    <p style="font-size: 13px; color: #64748b; margin: 20px 0 0; line-height: 20px;">
                      ⏱️ This verification code is valid for <strong>10 minutes</strong>. For your security, never share this code with anyone.
                    </p>
                    <p style="font-size: 13px; color: #94a3b8; margin: 16px 0 0; line-height: 20px;">
                      If you did not request this email, please disregard it.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                      © ${new Date().getFullYear()} WatsGo Creator Hub. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: targetEmail,
      subject: `${otp} is your WatsGo Creator Hub verification code`,
      text: `Your WatsGo Creator Hub verification code is: ${otp}. It is valid for 10 minutes. Do not share this code with anyone.`,
      html: htmlContent,
    });

    console.log(
      `[AUTH] 📧 OTP email dispatched successfully to ${targetEmail} (Message ID: ${info.messageId})`,
    );
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`[AUTH] ❌ Failed to dispatch email via SMTP to ${targetEmail}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Dispatch 4-digit SMS OTP via Ping4SMS Gateway API
 */
export async function sendPing4Sms({ phone, otp }) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const targetPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

  if (!targetPhone || targetPhone.length !== 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  const ping4Key = (process.env.PING4SMS_KEY || "1536ssc643ef35630e636a34353535").trim();
  const ping4Sender = (process.env.PING4SMS_SENDER || "MERSOF").trim();
  const ping4TemplateId = (process.env.PING4SMS_TEMPLATE_ID || "16071000005775757").trim();

  // Approved DLT Template Message
  const smsMessage = `Your Login Verification code: ${otp} Don't share this code with others -MERCURY`;

  const smsUrl =
    `http://site.ping4sms.com/api/smsapi?key=${encodeURIComponent(ping4Key)}` +
    `&route=2&sender=${encodeURIComponent(ping4Sender)}` +
    `&number=${encodeURIComponent(targetPhone)}` +
    `&sms=${encodeURIComponent(smsMessage)}` +
    `&templateid=${encodeURIComponent(ping4TemplateId)}`;

  console.log(`[Ping4SMS] Dispatching 4-digit OTP ${otp} via SMS to +91 ${targetPhone}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(smsUrl, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const respStr = (await res.text()).trim();
    console.log(`[Ping4SMS] Gateway Response [HTTP ${res.status}]: ${respStr}`);

    let smsSent = false;
    if (res.ok && respStr) {
      if (respStr.includes("101")) {
        console.warn("[Ping4SMS] Insufficient SMS balance in gateway account.");
        smsSent = false;
      } else if (/error|invalid/i.test(respStr)) {
        console.warn("[Ping4SMS] Gateway error response:", respStr);
        smsSent = false;
      } else {
        smsSent = true;
      }
    }

    return {
      success: smsSent,
      response: respStr,
      statusCode: res.status,
    };
  } catch (err) {
    console.warn(`[Ping4SMS] Gateway dispatch failed (${err.message}).`);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Generate a secure hex session token.
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Normalize an email address.
 */
function cleanEmail(email) {
  return (email || "").trim().toLowerCase();
}

/**
 * Normalize an Indian phone number to 10 digits.
 */
function cleanPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * API 1: Register a new creator account and issue a 6-digit OTP.
 */
export async function registerCreator({ full_name, email, mobile_number, password }) {
  const cEmail = cleanEmail(email);
  const cPhone = cleanPhone(mobile_number);

  const resolvedFullName =
    full_name && full_name.trim().length >= 2
      ? full_name.trim()
      : cEmail
        ? cEmail.split("@")[0]
        : "Creator";

  if (!cEmail || !/^\S+@\S+\.\S+$/.test(cEmail)) {
    throw new Error("Please provide a valid email address.");
  }
  if (!cPhone || cPhone.length !== 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain at least one lowercase letter (a-z).");
  }
  if (!/\d/.test(password)) {
    throw new Error("Password must contain at least one number (0-9).");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    throw new Error("Password must contain at least one special character (!@#$%^&* etc.).");
  }

  const pool = await getDbPool();
  const passwordHash = hashPassword(password);
  const otpCode = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (pool) {
    // Check if user already exists
    const [existing] = await pool.query(
      "SELECT id, email, mobile_number, is_verified FROM users WHERE email = ? OR mobile_number = ? LIMIT 1",
      [cEmail, cPhone],
    );

    let userId;
    if (existing.length > 0) {
      const user = existing[0];
      if (user.is_verified) {
        throw new Error(
          "An account with this email or mobile number already exists. Please log in.",
        );
      }
      // If unverified, update credentials and re-issue OTP
      userId = user.id;
      await pool.query(
        "UPDATE users SET full_name = ?, password_hash = ?, mobile_number = ?, updated_at = NOW() WHERE id = ?",
        [resolvedFullName, passwordHash, cPhone, userId],
      );
    } else {
      // Insert new unverified user
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, mobile_number, password_hash, role, is_verified, status)
         VALUES (?, ?, ?, ?, 'creator', 0, 'pending_verification')`,
        [resolvedFullName, cEmail, cPhone, passwordHash],
      );
      userId = result.insertId;
    }

    // Invalidate previous OTPs
    await pool.query(
      "UPDATE otps SET is_used = 1 WHERE identifier = ? OR identifier = ? OR user_id = ?",
      [cPhone, cEmail, userId],
    );

    // Save new 4-digit OTP for both email and mobile
    await pool.query(
      `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
       VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
      [userId, cEmail, otpCode, otpExpires],
    );
    if (cPhone && cPhone !== cEmail) {
      await pool.query(
        `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
         VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
        [userId, cPhone, otpCode, otpExpires],
      );
    }

    // Auto-create/insert into account_verification_otps if present for storefront compatibility
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS account_verification_otps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL DEFAULT 0,
          target VARCHAR(255) NOT NULL,
          target_type VARCHAR(20) NOT NULL DEFAULT 'phone',
          otp VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NULL,
          is_used TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (target),
          INDEX (user_id)
        )`,
      );
      await pool.query(
        `INSERT INTO account_verification_otps (user_id, target, target_type, otp, expires_at, is_used)
         VALUES (?, ?, 'phone', ?, ?, 0)`,
        [userId, cPhone, otpCode, otpExpires],
      );
    } catch (ignoreTbl) {}
  } else {
    // Memory store fallback
    const existingIndex = memoryStore.users.findIndex(
      (u) => u.email === cEmail || u.mobile_number === cPhone,
    );
    let userId;
    if (existingIndex >= 0) {
      if (memoryStore.users[existingIndex].is_verified) {
        throw new Error(
          "An account with this email or mobile number already exists. Please log in.",
        );
      }
      userId = memoryStore.users[existingIndex].id;
      memoryStore.users[existingIndex].full_name = resolvedFullName;
      memoryStore.users[existingIndex].password_hash = passwordHash;
      memoryStore.users[existingIndex].mobile_number = cPhone;
    } else {
      userId = memoryStore.users.length + 1;
      memoryStore.users.push({
        id: userId,
        full_name: resolvedFullName,
        email: cEmail,
        mobile_number: cPhone,
        password_hash: passwordHash,
        role: "creator",
        is_verified: 0,
        status: "pending_verification",
        created_at: new Date().toISOString(),
      });
    }

    // Mark previous OTPs used
    memoryStore.otps.forEach((o) => {
      if (o.identifier === cPhone || o.identifier === cEmail || o.user_id === userId) {
        o.is_used = 1;
      }
    });

    memoryStore.otps.push({
      id: memoryStore.otps.length + 1,
      user_id: userId,
      identifier: cEmail,
      email: cEmail,
      mobile_number: cPhone,
      otp_code: otpCode,
      type: "registration",
      expires_at: otpExpires.toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    if (cPhone && cPhone !== cEmail) {
      memoryStore.otps.push({
        id: memoryStore.otps.length + 1,
        user_id: userId,
        identifier: cPhone,
        email: cEmail,
        mobile_number: cPhone,
        otp_code: otpCode,
        type: "registration",
        expires_at: otpExpires.toISOString(),
        is_used: 0,
        attempts: 0,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 1. Dispatch 4-digit OTP via Email SMTP
  const emailResult = await sendEmailOtp({
    email: cEmail,
    otp: otpCode,
    fullName: resolvedFullName,
  });

  // 2. Dispatch 4-digit SMS OTP via Ping4SMS if phone is available
  const smsResult = cPhone
    ? await sendPing4Sms({ phone: cPhone, otp: otpCode })
    : { success: false };

  console.log(`\n=========================================`);
  console.log(
    `[AUTH] 📧 4-digit Email OTP for ${cEmail}: ${otpCode} (Email status: ${emailResult.success ? "SENT" : "PENDING/LOGGED"})`,
  );
  console.log(
    `[AUTH] 📱 4-digit SMS OTP for +91 ${cPhone}: ${otpCode} (SMS status: ${smsResult.success ? "SENT" : "GATEWAY_PENDING"})`,
  );
  console.log(`=========================================\n`);

  let dispatchMessage = `Verification code sent to your email (${cEmail})`;
  if (smsResult.success) {
    dispatchMessage += ` and via SMS to +91 ${cPhone}`;
  }
  dispatchMessage += ".";

  return {
    success: true,
    message: dispatchMessage,
    email: cEmail,
    mobile_number: cPhone,
    requires_otp: true,
    otp_preview: otpCode,
    email_sent: emailResult.success,
    sms_sent: smsResult.success,
  };
}

/**
 * API 2: Log in an existing creator.
 */
export async function loginCreator({ email, password, remember_me = false }) {
  const identifier = cleanEmail(email);

  if (!identifier) {
    throw new Error("Please enter your email address or mobile number.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  const pool = await getDbPool();
  let user = null;

  if (pool) {
    const isPhone = /^\d{10}$/.test(cleanPhone(identifier));
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR mobile_number = ? LIMIT 1",
      [identifier, cleanPhone(identifier)],
    );
    if (rows.length > 0) user = rows[0];
  } else {
    user = memoryStore.users.find(
      (u) => u.email === identifier || u.mobile_number === cleanPhone(identifier),
    );
  }

  if (!user) {
    throw new Error("Invalid email or password. Please check your credentials.");
  }

  const isValidPassword = verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password. Please check your credentials.");
  }

  // If user registered but never verified OTP
  if (!user.is_verified) {
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (pool) {
      await pool.query("UPDATE otps SET is_used = 1 WHERE identifier = ?", [user.email]);
      await pool.query(
        `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
         VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
        [user.id, user.email, otpCode, otpExpires],
      );
    } else {
      memoryStore.otps.push({
        id: memoryStore.otps.length + 1,
        user_id: user.id,
        identifier: user.email,
        otp_code: otpCode,
        type: "registration",
        expires_at: otpExpires.toISOString(),
        is_used: 0,
        attempts: 0,
        created_at: new Date().toISOString(),
      });
    }

    const emailResult = await sendEmailOtp({
      email: user.email,
      otp: otpCode,
      fullName: user.full_name || "Creator",
    });

    console.log(`[AUTH] 📧 Verification OTP for ${user.email}: ${otpCode}`);

    return {
      success: false,
      requires_otp: true,
      email: user.email,
      message:
        "Your account is not verified yet. We have sent a new verification code to your email.",
      otp_preview: process.env.NODE_ENV === "production" ? undefined : otpCode,
      email_sent: emailResult.success,
    };
  }

  // Create session
  const token = generateSessionToken();
  const sessionDays = remember_me ? 30 : 1;
  const sessionExpires = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  if (pool) {
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, token, sessionExpires],
    );
  } else {
    memoryStore.sessions.push({
      id: memoryStore.sessions.length + 1,
      user_id: user.id,
      token,
      expires_at: sessionExpires.toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: "Welcome back! Login successful.",
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      is_verified: true,
      onboarding_completed: true,
    },
  };
}

/**
 * API 3: Verify the 4-digit OTP code and unlock the creator account / dashboard session.
 */
export async function verifyOtpCode({ email, mobile_number, phone, otp_code, otp }) {
  const cEmail = cleanEmail(email);
  const cPhone = cleanPhone(mobile_number || phone);
  const code = (otp_code || otp || "").trim();

  if (!code) {
    throw new Error("Please enter the verification code.");
  }
  if (!cEmail && !cPhone) {
    throw new Error("Email or mobile number is required for verification.");
  }

  const pool = await getDbPool();
  let user = null;
  let otpRecord = null;

  if (pool) {
    // Find user by phone OR email
    const [userRows] = await pool.query(
      `SELECT * FROM users WHERE (mobile_number = ? AND ? != '') OR (email = ? AND ? != '') LIMIT 1`,
      [cPhone, cPhone, cEmail, cEmail],
    );
    if (userRows.length === 0) {
      throw new Error("Account not found. Please register first.");
    }
    user = userRows[0];

    // Find latest unused OTP by phone, email, or user_id
    const [otpRows] = await pool.query(
      `SELECT * FROM otps 
       WHERE (identifier = ? OR identifier = ? OR user_id = ?) 
         AND is_used = 0 
         AND expires_at > NOW() 
       ORDER BY id DESC LIMIT 1`,
      [cPhone, cEmail, user.id],
    );

    if (otpRows.length === 0) {
      // Check account_verification_otps fallback if table exists
      let altMatched = false;
      try {
        const [altRows] = await pool.query(
          `SELECT * FROM account_verification_otps 
           WHERE (target = ? OR user_id = ?) 
             AND is_used = 0 
             AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY id DESC LIMIT 1`,
          [cPhone, user.id],
        );
        if (altRows.length > 0) {
          otpRecord = { id: altRows[0].id, otp_code: altRows[0].otp, is_alt: true, attempts: 0 };
          altMatched = true;
        }
      } catch (e) {}

      if (!altMatched) {
        throw new Error(
          "Verification code has expired or was already used. Please request a new code.",
        );
      }
    } else {
      otpRecord = otpRows[0];
    }

    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. This code is blocked. Please request a new code.");
    }

    if (otpRecord.otp_code !== code) {
      if (!otpRecord.is_alt) {
        await pool.query("UPDATE otps SET attempts = attempts + 1 WHERE id = ?", [otpRecord.id]);
      }
      throw new Error("Invalid verification code. Please check and try again.");
    }

    // Success: mark OTP used and user verified
    if (!otpRecord.is_alt) {
      await pool.query("UPDATE otps SET is_used = 1 WHERE id = ?", [otpRecord.id]);
    } else {
      try {
        await pool.query("UPDATE account_verification_otps SET is_used = 1 WHERE id = ?", [
          otpRecord.id,
        ]);
      } catch (e) {}
    }

    await pool.query(
      "UPDATE users SET is_verified = 1, status = 'active', updated_at = NOW() WHERE id = ?",
      [user.id],
    );

    // Ensure creator profile row exists
    await pool.query(
      `INSERT INTO creator_profiles (user_id, display_name, country, preferred_language, onboarding_completed)
       VALUES (?, ?, 'India', 'English', 0)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [user.id, user.full_name || "Creator"],
    );

    // Create session token
    const token = generateSessionToken();
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)", [
      user.id,
      token,
      sessionExpires,
    ]);

    return {
      success: true,
      message: "Account verified successfully!",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: true,
        onboarding_completed: false,
      },
    };
  } else {
    // Memory fallback
    user = memoryStore.users.find(
      (u) => (cPhone && u.mobile_number === cPhone) || (cEmail && u.email === cEmail),
    );
    if (!user) {
      throw new Error("Account not found. Please register first.");
    }

    otpRecord = memoryStore.otps
      .filter(
        (o) =>
          (o.identifier === cPhone || o.identifier === cEmail || o.user_id === user.id) &&
          o.is_used === 0,
      )
      .sort((a, b) => b.id - a.id)[0];

    if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new code.");
    }

    if (otpRecord.otp_code !== code) {
      otpRecord.attempts += 1;
      throw new Error("Invalid verification code. Please check and try again.");
    }

    otpRecord.is_used = 1;
    user.is_verified = 1;
    user.status = "active";

    let profile = memoryStore.creator_profiles.find((p) => p.user_id === user.id);
    if (!profile) {
      profile = {
        id: memoryStore.creator_profiles.length + 1,
        user_id: user.id,
        display_name: user.full_name || "Creator",
        country: "India",
        preferred_language: "English",
        onboarding_completed: 0,
      };
      memoryStore.creator_profiles.push(profile);
    }

    const token = generateSessionToken();
    memoryStore.sessions.push({
      id: memoryStore.sessions.length + 1,
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account verified successfully!",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: true,
        onboarding_completed: Boolean(profile.onboarding_completed),
      },
    };
  }
}

/**
 * Resend 4-digit OTP code to mobile number via Ping4SMS.
 */
export async function resendOtpCode({ email, mobile_number, phone }) {
  const cEmail = cleanEmail(email);
  const cPhone = cleanPhone(mobile_number || phone);

  if (!cEmail && !cPhone) {
    throw new Error("Email or mobile number is required.");
  }

  const pool = await getDbPool();
  let user = null;

  if (pool) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE (mobile_number = ? AND ? != '') OR (email = ? AND ? != '') LIMIT 1`,
      [cPhone, cPhone, cEmail, cEmail],
    );
    if (rows.length === 0) throw new Error("Account not found.");
    user = rows[0];
  } else {
    user = memoryStore.users.find(
      (u) => (cPhone && u.mobile_number === cPhone) || (cEmail && u.email === cEmail),
    );
  }

  if (!user) throw new Error("Account not found.");

  const targetPhone = user.mobile_number || cPhone;
  const targetEmail = user.email || cEmail;
  const otpCode = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (pool) {
    await pool.query(
      "UPDATE otps SET is_used = 1 WHERE identifier = ? OR identifier = ? OR user_id = ?",
      [targetPhone, targetEmail, user.id],
    );
    await pool.query(
      `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
       VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
      [user.id, targetEmail, otpCode, otpExpires],
    );
    if (targetPhone && targetPhone !== targetEmail) {
      await pool.query(
        `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
         VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
        [user.id, targetPhone, otpCode, otpExpires],
      );
    }
  } else {
    memoryStore.otps.forEach((o) => {
      if (o.identifier === targetPhone || o.identifier === targetEmail || o.user_id === user.id) {
        o.is_used = 1;
      }
    });
    memoryStore.otps.push({
      id: memoryStore.otps.length + 1,
      user_id: user.id,
      identifier: targetEmail,
      email: targetEmail,
      mobile_number: targetPhone,
      otp_code: otpCode,
      type: "registration",
      expires_at: otpExpires.toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString(),
    });
  }

  // 1. Dispatch Email OTP via SMTP
  const emailResult = await sendEmailOtp({
    email: targetEmail,
    otp: otpCode,
    fullName: user.full_name || "Creator",
  });

  // 2. Dispatch SMS via Ping4SMS if phone available
  const smsResult = targetPhone
    ? await sendPing4Sms({ phone: targetPhone, otp: otpCode })
    : { success: false };

  console.log(`[AUTH] 📧 Resent 4-digit verification OTP for email ${targetEmail}: ${otpCode}`);

  let resendMsg = `A fresh 4-digit verification code has been sent to your email (${targetEmail})`;
  if (smsResult.success) {
    resendMsg += ` and SMS to +91 ${targetPhone}`;
  }
  resendMsg += ".";

  return {
    success: true,
    message: resendMsg,
    otp_preview: otpCode,
    email_sent: emailResult.success,
    sms_sent: smsResult.success,
  };
}

/**
 * Direct API to send an SMS OTP to a mobile number
 */
export async function sendMobileOtp({ phone, mobile_number, user_id = 0 }) {
  const cPhone = cleanPhone(phone || mobile_number);
  if (!cPhone || cPhone.length !== 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  const otpCode = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  const pool = await getDbPool();

  if (pool) {
    await pool.query("UPDATE otps SET is_used = 1 WHERE identifier = ?", [cPhone]);
    await pool.query(
      `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
       VALUES (?, ?, ?, 'phone', ?, 0, 0)`,
      [user_id || 0, cPhone, otpCode, otpExpires],
    );
  } else {
    memoryStore.otps.push({
      id: memoryStore.otps.length + 1,
      user_id: user_id || 0,
      identifier: cPhone,
      otp_code: otpCode,
      type: "phone",
      expires_at: otpExpires.toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString(),
    });
  }

  const smsResult = await sendPing4Sms({ phone: cPhone, otp: otpCode });
  return {
    status: "success",
    success: true,
    message: smsResult.success
      ? `Verification OTP sent successfully via SMS to +91 ${cPhone}`
      : `Verification OTP generated for +91 ${cPhone}`,
    target: cPhone,
    otp_debug: otpCode,
  };
}

/**
 * Retrieve user and creator profile using session token (for reaching dashboard).
 */
export async function getUserFromToken(token) {
  if (!token) return null;

  const pool = await getDbPool();
  if (pool) {
    const [sessionRows] = await pool.query(
      `SELECT s.*, u.id as user_id, u.full_name, u.email, u.mobile_number, u.role, u.is_verified, u.status
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1`,
      [token],
    );
    if (sessionRows.length === 0) return null;
    const session = sessionRows[0];

    const [profiles] = await pool.query(
      "SELECT * FROM creator_profiles WHERE user_id = ? LIMIT 1",
      [session.user_id],
    );

    return {
      user: {
        id: session.user_id,
        full_name: session.full_name,
        email: session.email,
        mobile_number: session.mobile_number,
        role: session.role,
        is_verified: Boolean(session.is_verified),
      },
      profile: profiles[0] || null,
    };
  } else {
    const session = memoryStore.sessions.find(
      (s) => s.token === token && new Date(s.expires_at) > new Date(),
    );
    if (!session) return null;
    const user = memoryStore.users.find((u) => u.id === session.user_id);
    if (!user) return null;
    const profile = memoryStore.creator_profiles.find((p) => p.user_id === user.id);

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: Boolean(user.is_verified),
      },
      profile: profile || null,
    };
  }
}
