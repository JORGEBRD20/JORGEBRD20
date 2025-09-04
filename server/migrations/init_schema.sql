-- Migration: core schema for Piscina app
-- Creates usuarios, piscina, quadrados, historico tables

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `password` VARCHAR(255) NULL,
  `verification_hash` VARCHAR(255) NULL,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `display_name` VARCHAR(255) NULL,
  `balance` DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `piscina` (
  `id` INT NOT NULL,
  `balance` DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quadrados` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slot` INT NOT NULL,
  `rented_by` BIGINT UNSIGNED NULL,
  `rented_until` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slot_unique` (`slot`),
  INDEX (`rented_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `historico` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `type` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18,4) NOT NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`user_id`),
  INDEX (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional foreign keys (commented out for easier migration across environments)
-- ALTER TABLE quadrados ADD CONSTRAINT fk_quadrados_rented_by FOREIGN KEY (rented_by) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE historico ADD CONSTRAINT fk_historico_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE;
