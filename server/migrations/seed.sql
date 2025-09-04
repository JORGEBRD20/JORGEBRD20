-- Seed data for Piscina app

-- Insert pool row (id = 1) if not exists
INSERT INTO `piscina` (`id`, `balance`) SELECT 1, 0.0000 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `piscina` WHERE id = 1);

-- Insert 16 quadrados slots if they don't exist
INSERT INTO `quadrados` (`slot`) 
SELECT seq.slot FROM (
  SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
  UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
  UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16
) AS seq
WHERE NOT EXISTS (SELECT 1 FROM quadrados q WHERE q.slot = seq.slot);

-- Optional demo user (commented out). To create a demo user uncomment and set password hash.
-- INSERT INTO usuarios (email, phone, password, verified, display_name, balance) VALUES ('demo@piscina.test', '+5511999999999', '$2b$10$EXAMPLEHASH...', 1, 'Demo User', 1000.00);

-- Create index on historico.created_at for faster queries
ALTER TABLE historico ADD INDEX IF NOT EXISTS idx_historico_created_at (created_at);
