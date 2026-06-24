-- Distingue los dos motivos posibles de un scan_type = 'external':
--   'unknown'        -> el codigo no existe en ningun activo de la BD
--   'other_campus'   -> el activo existe pero pertenece a otra sede
--                       (San Jose, Cartago, San Carlos, Limon)
-- Es NULL para located y duplicate, donde no aplica esta distincion.
ALTER TABLE scan_records
  ADD COLUMN IF NOT EXISTS external_reason TEXT
    CHECK (external_reason IN ('unknown', 'other_campus'));