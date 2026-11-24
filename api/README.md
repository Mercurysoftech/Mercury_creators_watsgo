# WatsGo Creator Hub - API & Database Documentation

This folder contains the backend API endpoints and database schema for the **WatsGo Creator Hub** authentication flow (Register -> Verify OTP -> Login -> Dashboard).

---

## 🗄️ Database Tables (`schema.sql`)

### 1. `users`

Stores user profile credentials, verification status, and timestamps.

- `id`: BIGINT (Primary Key)
- `full_name`: VARCHAR(150) - Creator's name
- `email`: VARCHAR(191) - Unique email address
- `mobile_number`: VARCHAR(20) - 10-digit phone number
- `password_hash`: VARCHAR(255) - Secure PBKDF2/Bcrypt hash
- `role`: ENUM ('creator', 'brand', 'admin')
- `is_verified`: TINYINT(1) - `0` = Pending OTP verification, `1` = Verified
- `status`: ENUM ('pending_verification', 'active', 'suspended', 'deactivated')
- `terms_accepted`: TINYINT(1)
- `created_at` / `updated_at`: DATETIME

### 2. `otps`

Stores 6-digit one-time passwords for email/phone verification.

- `id`: BIGINT (Primary Key)
- `user_id`: BIGINT (Foreign Key referencing `users.id`)
- `identifier`: VARCHAR(191) - Email or mobile where OTP was dispatched
- `otp_code`: VARCHAR(10) - 6-digit verification code
- `type`: ENUM ('registration', 'login', 'password_reset')
- `expires_at`: DATETIME - OTP valid window (10 minutes)
- `is_used`: TINYINT(1) - Marked `1` once consumed
- `attempts`: INT - Brute force limit counter (max 5)
- `created_at`: DATETIME

### 3. `sessions`

Stores active session tokens when user is logged in or verified.

- `id`: BIGINT (Primary Key)
- `user_id`: BIGINT (Foreign Key referencing `users.id`)
- `token`: VARCHAR(255) - Cryptographic Bearer token
- `ip_address`: VARCHAR(45)
- `user_agent`: TEXT
- `expires_at`: DATETIME
- `last_activity_at`: DATETIME

### 4. `creator_profiles`

Stores creator personalization, social channels, and payout details for the dashboard.

- `id`: BIGINT (Primary Key)
- `user_id`: BIGINT (Unique, references `users.id`)
- `display_name`: VARCHAR(150)
- `bio`: TEXT
- `niche_categories`: JSON
- `payout_bank_name`, `payout_account_number_masked`, `payout_ifsc`, `payout_upi_id`
- `onboarding_completed`: TINYINT(1)

---

## 🌐 API Endpoints

### 1. `POST /api/register`

Creates a pending user account and generates a 6-digit OTP.

**Request Body:**

```json
{
  "full_name": "Priya Malhotra",
  "email": "priya@email.com",
  "mobile_number": "9876543210",
  "password": "Password123!"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Verification code sent to your email address and mobile number.",
  "email": "priya@email.com",
  "requires_otp": true
}
```

---

### 2. `POST /api/verify-otp`

Verifies the 6-digit OTP code, marks the user verified, and generates an authenticated session token.

**Request Body:**

```json
{
  "email": "priya@email.com",
  "otp_code": "482716"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Account verified successfully!",
  "token": "7a3f81e2b0...",
  "user": {
    "id": 1,
    "full_name": "Priya Malhotra",
    "email": "priya@email.com",
    "mobile_number": "9876543210",
    "role": "creator",
    "is_verified": true,
    "onboarding_completed": false
  }
}
```

---

### 3. `POST /api/login`

Authenticates an existing creator using email (or mobile) and password.

**Request Body:**

```json
{
  "email": "priya@email.com",
  "password": "Password123!",
  "remember_me": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Welcome back! Login successful.",
  "token": "7a3f81e2b0...",
  "user": {
    "id": 1,
    "full_name": "Priya Malhotra",
    "email": "priya@email.com",
    "mobile_number": "9876543210",
    "role": "creator",
    "is_verified": true,
    "onboarding_completed": true
  }
}
```

---

### 4. `POST /api/resend-otp`

Resends a fresh 6-digit code with a new 10-minute validity window.

**Request Body:**

```json
{
  "email": "priya@email.com"
}
```

---

### 5. `GET /api/me`

Retrieves the logged-in creator user and profile using the Bearer token.

**Request Header:**

```
Authorization: Bearer <token>
```

---

## 🚀 How to Run the Node.js API Server

### Local Development:

Run the standalone Node API server:

```bash
node api/server.js
```

Or use the npm script:

```bash
npm run api
```

The server will start on port `5000` (or `process.env.PORT`).

### Production Deployment with PM2 (Recommended):

On your live production server (e.g. `creators.watsgo.in`):

```bash
# 1. Install PM2 process manager globally (if not already installed)
npm install -g pm2

# 2. Start the API server in background
pm2 start api/server.js --name "watsgo-api"

# 3. Save PM2 state to auto-restart on system reboot
pm2 save
pm2 startup

# 4. Check status & logs anytime
pm2 status
pm2 logs watsgo-api
```

### Production Reverse Proxy Setup:

If using Apache on the server (like HestiaCP/cPanel), requests to `/api/*` are reverse-proxied to Node.js on port 5000 via `.htaccess`:

```apache
<IfModule mod_proxy.c>
  RewriteRule ^api/(.*)$ http://127.0.0.1:5000/api/$1 [P,L]
</IfModule>
```

If using Nginx directly:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
