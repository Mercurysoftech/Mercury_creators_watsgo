-- ============================================================================
-- WatsGo Creator Hub Database Schema
-- Focus: Authentication, User Registration, Login & OTP Verification
-- Compatible with MySQL 8.0+ / MariaDB 10.4+ / AWS RDS / GCP Cloud SQL
-- ============================================================================

-- Create Database (Optional - run if database does not already exist)
CREATE DATABASE IF NOT EXISTS `watsgo_creators`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `watsgo_creators`;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- Stores core creator credentials, contact details, and account status.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(150) NOT NULL COMMENT 'Creator full legal name',
  `email` VARCHAR(191) NOT NULL COMMENT 'Email address used for sign in and notices',
  `mobile_number` VARCHAR(20) NOT NULL COMMENT 'Indian mobile number (+91 format or 10 digits)',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt or Argon2 hashed password',
  `role` ENUM('creator', 'brand', 'admin') NOT NULL DEFAULT 'creator' COMMENT 'Access role',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Unverified, 1 = OTP Verified',
  `status` ENUM('pending_verification', 'active', 'suspended', 'deactivated') NOT NULL DEFAULT 'pending_verification' COMMENT 'Account lifecycle status',
  `terms_accepted` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 if user accepted Terms & Privacy policy',
  `terms_accepted_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when user accepted terms',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_mobile_number` (`mobile_number`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: otps
-- Stores temporary one-time passwords for registration, login, and resets.
-- Includes expiry window, attempt counter to prevent brute force, and used flags.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL COMMENT 'References users.id once user row is created',
  `identifier` VARCHAR(191) NOT NULL COMMENT 'Target email or mobile number where OTP was sent',
  `otp_code` VARCHAR(10) NOT NULL COMMENT '6-digit OTP code (e.g. 482716)',
  `type` ENUM('registration', 'login', 'password_reset') NOT NULL DEFAULT 'registration' COMMENT 'Purpose of the OTP',
  `expires_at` DATETIME NOT NULL COMMENT 'Timestamp when OTP expires (typically 10-15 mins)',
  `is_used` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Pending, 1 = Successfully verified',
  `attempts` INT NOT NULL DEFAULT 0 COMMENT 'Count of verification tries; reject if >= 5',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP address that requested OTP',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_otps_identifier_type` (`identifier`, `type`, `is_used`, `expires_at`),
  INDEX `idx_otps_user_id` (`user_id`),
  CONSTRAINT `fk_otps_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: sessions (auth_tokens)
-- Stores active bearer tokens / session records after successful login/OTP verification.
-- Enables secure authorization for subsequent requests (dashboard, profile, etc.).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Authenticated user',
  `token` VARCHAR(255) NOT NULL COMMENT 'Cryptographic session/bearer token (hash or UUID)',
  `ip_address` VARCHAR(45) NULL COMMENT 'Client IP address',
  `user_agent` TEXT NULL COMMENT 'Browser/device user agent',
  `expires_at` DATETIME NOT NULL COMMENT 'Session expiration timestamp',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sessions_token` (`token`),
  INDEX `idx_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: creator_profiles
-- Stores onboarding and profile information for creator hub dashboard.
-- Created automatically upon user verification.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `display_name` VARCHAR(150) NULL COMMENT 'Public creator handle or name, e.g. Priya Moves',
  `bio` TEXT NULL COMMENT 'Short creator biography',
  `avatar_url` VARCHAR(255) NULL,
  `country` VARCHAR(100) NOT NULL DEFAULT 'India',
  `city` VARCHAR(100) NULL,
  `preferred_language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `niche_categories` JSON NULL COMMENT 'Array of selected content categories e.g. ["Lifestyle","Travel"]',
  `audience_size` VARCHAR(50) NULL COMMENT 'e.g. 100K – 250K',
  `primary_platform` VARCHAR(50) NULL COMMENT 'e.g. Instagram',
  `payout_bank_name` VARCHAR(100) NULL,
  `payout_account_holder` VARCHAR(150) NULL,
  `payout_account_number_masked` VARCHAR(30) NULL COMMENT 'Masked account e.g. •••• 1893',
  `payout_ifsc` VARCHAR(20) NULL,
  `payout_upi_id` VARCHAR(100) NULL,
  `onboarding_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Pending onboarding, 1 = Ready for dashboard',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_creator_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_creator_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Sample / Initial Seed Data (Optional for testing)
-- ----------------------------------------------------------------------------
-- Password for demo user: DemoPass123! (hashed using bcrypt)
-- Note: Replace with real credentials in production.
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `full_name`, `email`, `mobile_number`, `password_hash`, `role`, `is_verified`, `status`)
VALUES 
(1, 'Priya Malhotra', 'priya@email.com', '9876543210', '$2b$10$w8.15tKkWpYw7gZ/aJzE2.tY0z8HovD/Ufq2u8jVzH5eI2aWl41iC', 'creator', 1, 'active')
ON DUPLICATE KEY UPDATE `email`=`email`;

INSERT INTO `creator_profiles` (`user_id`, `display_name`, `bio`, `country`, `city`, `preferred_language`, `niche_categories`, `audience_size`, `primary_platform`, `onboarding_completed`)
VALUES
(1, 'Priya Moves', 'Lifestyle, mindful travel and everyday wellness.', 'India', 'Mumbai', 'English', '["Lifestyle", "Travel"]', '100K – 250K', 'Instagram', 1)
ON DUPLICATE KEY UPDATE `user_id`=`user_id`;
