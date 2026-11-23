import crypto from 'node:crypto';
import { getDbPool, memoryStore } from './db.js';

/**
 * Hash a password using PBKDF2 with a cryptographically secure random salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${hash}$${salt}`;
}

/**
 * Verify a plain text password against a stored hash+salt string.
 */
export function verifyPassword(password, storedCombinedHash) {
  if (!storedCombinedHash) return false;
  // Fallback demo check if demo hash
  if (storedCombinedHash.includes('$')) {
    const [originalHash, salt] = storedCombinedHash.split('$');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  }
  // Plain comparison fallback for demo setups
  return password === storedCombinedHash;
}

/**
 * Generate a 6-digit secure numeric OTP.
 */
export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a secure hex session token.
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Normalize an email address.
 */
function cleanEmail(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * Normalize an Indian phone number to 10 digits.
 */
function cleanPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * API 1: Register a new creator account and issue a 6-digit OTP.
 */
export async function registerCreator({ full_name, email, mobile_number, password }) {
  const cEmail = cleanEmail(email);
  const cPhone = cleanPhone(mobile_number);

  if (!full_name || full_name.trim().length < 2) {
    throw new Error('Please enter your full name (minimum 2 characters).');
  }
  if (!cEmail || !/^\S+@\S+\.\S+$/.test(cEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!cPhone || cPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const pool = await getDbPool();
  const passwordHash = hashPassword(password);
  const otpCode = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (pool) {
    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id, email, mobile_number, is_verified FROM users WHERE email = ? OR mobile_number = ? LIMIT 1',
      [cEmail, cPhone]
    );

    let userId;
    if (existing.length > 0) {
      const user = existing[0];
      if (user.is_verified) {
        throw new Error('An account with this email or mobile number already exists. Please log in.');
      }
      // If unverified, update credentials and re-issue OTP
      userId = user.id;
      await pool.query(
        'UPDATE users SET full_name = ?, password_hash = ?, mobile_number = ?, updated_at = NOW() WHERE id = ?',
        [full_name.trim(), passwordHash, cPhone, userId]
      );
    } else {
      // Insert new unverified user
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, mobile_number, password_hash, role, is_verified, status)
         VALUES (?, ?, ?, ?, 'creator', 0, 'pending_verification')`,
        [full_name.trim(), cEmail, cPhone, passwordHash]
      );
      userId = result.insertId;
    }

    // Invalidate previous OTPs
    await pool.query('UPDATE otps SET is_used = 1 WHERE identifier = ?', [cEmail]);

    // Save new OTP
    await pool.query(
      `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
       VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
      [userId, cEmail, otpCode, otpExpires]
    );
  } else {
    // Memory store fallback
    const existingIndex = memoryStore.users.findIndex(u => u.email === cEmail || u.mobile_number === cPhone);
    let userId;
    if (existingIndex >= 0) {
      if (memoryStore.users[existingIndex].is_verified) {
        throw new Error('An account with this email or mobile number already exists. Please log in.');
      }
      userId = memoryStore.users[existingIndex].id;
      memoryStore.users[existingIndex].full_name = full_name.trim();
      memoryStore.users[existingIndex].password_hash = passwordHash;
      memoryStore.users[existingIndex].mobile_number = cPhone;
    } else {
      userId = memoryStore.users.length + 1;
      memoryStore.users.push({
        id: userId,
        full_name: full_name.trim(),
        email: cEmail,
        mobile_number: cPhone,
        password_hash: passwordHash,
        role: 'creator',
        is_verified: 0,
        status: 'pending_verification',
        created_at: new Date().toISOString()
      });
    }

    // Mark previous OTPs used
    memoryStore.otps.forEach(o => {
      if (o.identifier === cEmail) o.is_used = 1;
    });

    memoryStore.otps.push({
      id: memoryStore.otps.length + 1,
      user_id: userId,
      identifier: cEmail,
      otp_code: otpCode,
      type: 'registration',
      expires_at: otpExpires.toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString()
    });
  }

  console.log(`\n=========================================`);
  console.log(`[AUTH] 📧 Verification OTP for ${cEmail}: ${otpCode}`);
  console.log(`=========================================\n`);

  return {
    success: true,
    message: 'Verification code sent to your email address and mobile number.',
    email: cEmail,
    requires_otp: true,
    // Provide otp_preview in non-production for instant verification/testing
    otp_preview: process.env.NODE_ENV === 'production' ? undefined : otpCode
  };
}

/**
 * API 2: Log in an existing creator.
 */
export async function loginCreator({ email, password, remember_me = false }) {
  const identifier = cleanEmail(email);

  if (!identifier) {
    throw new Error('Please enter your email address or mobile number.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const pool = await getDbPool();
  let user = null;

  if (pool) {
    const isPhone = /^\d{10}$/.test(cleanPhone(identifier));
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR mobile_number = ? LIMIT 1',
      [identifier, cleanPhone(identifier)]
    );
    if (rows.length > 0) user = rows[0];
  } else {
    user = memoryStore.users.find(u => u.email === identifier || u.mobile_number === cleanPhone(identifier));
  }

  if (!user) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  const isValidPassword = verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  // If user registered but never verified OTP
  if (!user.is_verified) {
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (pool) {
      await pool.query('UPDATE otps SET is_used = 1 WHERE identifier = ?', [user.email]);
      await pool.query(
        `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
         VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
        [user.id, user.email, otpCode, otpExpires]
      );
    } else {
      memoryStore.otps.push({
        id: memoryStore.otps.length + 1,
        user_id: user.id,
        identifier: user.email,
        otp_code: otpCode,
        type: 'registration',
        expires_at: otpExpires.toISOString(),
        is_used: 0,
        attempts: 0,
        created_at: new Date().toISOString()
      });
    }

    console.log(`[AUTH] 📧 Verification OTP for ${user.email}: ${otpCode}`);

    return {
      success: false,
      requires_otp: true,
      email: user.email,
      message: 'Your account is not verified yet. We have sent a new verification code to your email.',
      otp_preview: process.env.NODE_ENV === 'production' ? undefined : otpCode
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
      [user.id, token, sessionExpires]
    );
  } else {
    memoryStore.sessions.push({
      id: memoryStore.sessions.length + 1,
      user_id: user.id,
      token,
      expires_at: sessionExpires.toISOString(),
      created_at: new Date().toISOString()
    });
  }

  return {
    success: true,
    message: 'Welcome back! Login successful.',
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      is_verified: true,
      onboarding_completed: true
    }
  };
}

/**
 * API 3: Verify the 6-digit OTP code and unlock the dashboard session.
 */
export async function verifyOtpCode({ email, otp_code, type = 'registration' }) {
  const cEmail = cleanEmail(email);
  const code = (otp_code || '').trim();

  if (!cEmail) {
    throw new Error('Email address is required for verification.');
  }
  if (!code || code.length !== 6) {
    throw new Error('Please enter the complete 6-digit verification code.');
  }

  const pool = await getDbPool();
  let user = null;
  let otpRecord = null;

  if (pool) {
    const [userRows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cEmail]);
    if (userRows.length === 0) {
      throw new Error('Account not found. Please register first.');
    }
    user = userRows[0];

    const [otpRows] = await pool.query(
      `SELECT * FROM otps 
       WHERE identifier = ? AND is_used = 0 AND expires_at > NOW() 
       ORDER BY id DESC LIMIT 1`,
      [cEmail]
    );
    if (otpRows.length === 0) {
      throw new Error('Verification code has expired or was already used. Please request a new code.');
    }
    otpRecord = otpRows[0];

    if (otpRecord.attempts >= 5) {
      throw new Error('Too many failed attempts. This code is blocked. Please request a new code.');
    }

    if (otpRecord.otp_code !== code) {
      await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id]);
      throw new Error('Invalid verification code. Please check and try again.');
    }

    // Success: mark OTP used and user verified
    await pool.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
    await pool.query("UPDATE users SET is_verified = 1, status = 'active' WHERE id = ?", [user.id]);

    // Ensure creator profile row exists
    await pool.query(
      `INSERT INTO creator_profiles (user_id, display_name, country, preferred_language, onboarding_completed)
       VALUES (?, ?, 'India', 'English', 0)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [user.id, user.full_name]
    );

    // Create session token
    const token = generateSessionToken();
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, sessionExpires]
    );

    return {
      success: true,
      message: 'Account verified successfully!',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: true,
        onboarding_completed: false
      }
    };
  } else {
    // Memory fallback
    user = memoryStore.users.find(u => u.email === cEmail);
    if (!user) {
      throw new Error('Account not found. Please register first.');
    }

    otpRecord = memoryStore.otps
      .filter(o => o.identifier === cEmail && o.is_used === 0)
      .sort((a, b) => b.id - a.id)[0];

    if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (otpRecord.attempts >= 5) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    if (otpRecord.otp_code !== code) {
      otpRecord.attempts += 1;
      throw new Error('Invalid verification code. Please check and try again.');
    }

    otpRecord.is_used = 1;
    user.is_verified = 1;
    user.status = 'active';

    let profile = memoryStore.creator_profiles.find(p => p.user_id === user.id);
    if (!profile) {
      profile = {
        id: memoryStore.creator_profiles.length + 1,
        user_id: user.id,
        display_name: user.full_name,
        country: 'India',
        preferred_language: 'English',
        onboarding_completed: 0
      };
      memoryStore.creator_profiles.push(profile);
    }

    const token = generateSessionToken();
    memoryStore.sessions.push({
      id: memoryStore.sessions.length + 1,
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Account verified successfully!',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: true,
        onboarding_completed: Boolean(profile.onboarding_completed)
      }
    };
  }
}

/**
 * Resend OTP code to the user.
 */
export async function resendOtpCode({ email }) {
  const cEmail = cleanEmail(email);
  if (!cEmail) {
    throw new Error('Email address is required.');
  }

  const pool = await getDbPool();
  let user = null;

  if (pool) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cEmail]);
    if (rows.length === 0) throw new Error('Account not found.');
    user = rows[0];
  } else {
    user = memoryStore.users.find(u => u.email === cEmail);
  }

  if (!user) throw new Error('Account not found.');

  const otpCode = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (pool) {
    await pool.query('UPDATE otps SET is_used = 1 WHERE identifier = ?', [cEmail]);
    await pool.query(
      `INSERT INTO otps (user_id, identifier, otp_code, type, expires_at, is_used, attempts)
       VALUES (?, ?, ?, 'registration', ?, 0, 0)`,
      [user.id, cEmail, otpCode, otpExpires]
    );
  } else {
    memoryStore.otps.push({
      id: memoryStore.otps.length + 1,
      user_id: user.id,
      identifier: cEmail,
      otp_code: otpCode,
      type: 'registration',
      expires_at: otpExpires.toISOString(),
      is_used: 0,
      attempts: 0,
      created_at: new Date().toISOString()
    });
  }

  console.log(`[AUTH] 📧 Resent verification OTP for ${cEmail}: ${otpCode}`);

  return {
    success: true,
    message: 'A fresh verification code has been sent.',
    otp_preview: process.env.NODE_ENV === 'production' ? undefined : otpCode
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
      [token]
    );
    if (sessionRows.length === 0) return null;
    const session = sessionRows[0];

    const [profiles] = await pool.query(
      'SELECT * FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [session.user_id]
    );

    return {
      user: {
        id: session.user_id,
        full_name: session.full_name,
        email: session.email,
        mobile_number: session.mobile_number,
        role: session.role,
        is_verified: Boolean(session.is_verified)
      },
      profile: profiles[0] || null
    };
  } else {
    const session = memoryStore.sessions.find(s => s.token === token && new Date(s.expires_at) > new Date());
    if (!session) return null;
    const user = memoryStore.users.find(u => u.id === session.user_id);
    if (!user) return null;
    const profile = memoryStore.creator_profiles.find(p => p.user_id === user.id);

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_verified: Boolean(user.is_verified)
      },
      profile: profile || null
    };
  }
}
