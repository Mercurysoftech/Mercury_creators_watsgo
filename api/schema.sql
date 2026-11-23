-- Reference copy of Database Schema for API folder
-- Full documentation and source in /database/schema.sql

CREATE DATABASE IF NOT EXISTS `watsgo_creators`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `watsgo_creators`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `mobile_number` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('creator', 'brand', 'admin') NOT NULL DEFAULT 'creator',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('pending_verification', 'active', 'suspended', 'deactivated') NOT NULL DEFAULT 'pending_verification',
  `terms_accepted` TINYINT(1) NOT NULL DEFAULT 1,
  `terms_accepted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_mobile_number` (`mobile_number`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `otps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `identifier` VARCHAR(191) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `type` ENUM('registration', 'login', 'password_reset') NOT NULL DEFAULT 'registration',
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `attempts` INT NOT NULL DEFAULT 0,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_otps_identifier_type` (`identifier`, `type`, `is_used`, `expires_at`),
  INDEX `idx_otps_user_id` (`user_id`),
  CONSTRAINT `fk_otps_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sessions_token` (`token`),
  INDEX `idx_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `creator_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `display_name` VARCHAR(150) NULL,
  `bio` TEXT NULL,
  `country` VARCHAR(100) NOT NULL DEFAULT 'India',
  `city` VARCHAR(100) NULL,
  `preferred_language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `niche_categories` JSON NULL,
  `audience_size` VARCHAR(50) NULL,
  `primary_platform` VARCHAR(50) NULL,
  `payout_bank_name` VARCHAR(100) NULL,
  `payout_account_holder` VARCHAR(150) NULL,
  `payout_account_number_masked` VARCHAR(30) NULL,
  `payout_ifsc` VARCHAR(20) NULL,
  `payout_upi_id` VARCHAR(100) NULL,
  `onboarding_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_creator_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_creator_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample seed user (Password: Password123!)
INSERT INTO `users` (`id`, `full_name`, `email`, `mobile_number`, `password_hash`, `role`, `is_verified`, `status`)
VALUES 
(1, 'Priya Malhotra', 'priya@email.com', '9876543210', '7c69e4e80b6f776a64430400ca57d273a1324132673607eb45211711e4aad7a9a8861e01c1dfc84b0980ace416395ac10cd983a8394f878e4e3047ba04cbb8d0$7490d6997f8cac83279d00c33bc4b4a5', 'creator', 1, 'active')
ON DUPLICATE KEY UPDATE `email`=`email`;

INSERT INTO `creator_profiles` (`user_id`, `display_name`, `bio`, `country`, `city`, `preferred_language`, `niche_categories`, `audience_size`, `primary_platform`, `onboarding_completed`)
VALUES
(1, 'Priya Moves', 'Lifestyle, mindful travel and everyday wellness.', 'India', 'Mumbai', 'English', '["Lifestyle", "Travel"]', '100K – 250K', 'Instagram', 1)
ON DUPLICATE KEY UPDATE `user_id`=`user_id`;
