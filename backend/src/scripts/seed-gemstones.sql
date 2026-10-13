-- Global taş kataloğu tohumu (admin; USD baz karat fiyatı sonradan girilir)
-- Run: psql -U golden_user -d golden_marketplace -f seed-gemstones.sql

INSERT INTO gemstones ("storeId", "name", "pricePerCaratUSD", "cutMultipliers", "qualityMultipliers", "isActive")
SELECT NULL, x.name, 0, x.cuts::jsonb, '{}', true
FROM (VALUES
  ('Pırlanta', '{"baget": 1.2, "markiz": 1.15, "oval": 1.1, "prenses": 1.1, "yuvarlak": 1.0, "damla": 1.1, "zümrüt": 1.1}'),
  ('Yakut', '{}'),
  ('Zümrüt', '{}'),
  ('Safir', '{}')
) AS x(name, cuts)
WHERE NOT EXISTS (SELECT 1 FROM gemstones g WHERE g."storeId" IS NULL AND g.name = x.name);
