-- MySQL schema for Piscina de Liquidez

CREATE DATABASE IF NOT EXISTS piscina DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE piscina;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255),
  display_name VARCHAR(100),
  verified TINYINT DEFAULT 0,
  balance DECIMAL(10,2) DEFAULT 0.00,
  verification_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Piscina (single row storing pool balance)
CREATE TABLE IF NOT EXISTS piscina (
  id INT PRIMARY KEY DEFAULT 1,
  balance DECIMAL(14,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Quadrados (slots)
CREATE TABLE IF NOT EXISTS quadrados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot INT NOT NULL UNIQUE,
  rented_by INT NULL,
  rented_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rented_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Historico: depósitos, aluguéis, sorteios, pagamentos, taxas
CREATE TABLE IF NOT EXISTS historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Ensure pool row exists
INSERT INTO piscina (id, balance) SELECT 1, 0.00 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM piscina WHERE id=1);

-- Seed 16 slots
DELIMITER $$
CREATE PROCEDURE seed_slots()
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= 16 DO
    IF NOT EXISTS (SELECT 1 FROM quadrados WHERE slot = i) THEN
      INSERT INTO quadrados (slot) VALUES (i);
    END IF;
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL seed_slots();
DROP PROCEDURE IF EXISTS seed_slots;
