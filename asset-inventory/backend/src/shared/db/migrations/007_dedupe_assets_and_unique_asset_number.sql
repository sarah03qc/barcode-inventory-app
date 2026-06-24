-- Elimina activos duplicados por asset_number, conservando siempre
-- la fila mas reciente (mayor ctid) de cada asset_number repetido.
-- Los duplicados existentes son de pruebas de desarrollo.
DELETE FROM assets a
USING assets b
WHERE a.asset_number = b.asset_number
  AND a.ctid < b.ctid;

-- Elimina la restriccion vieja que permitia el mismo asset_number
-- en distintos batches (el origen del problema de duplicados)
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_asset_number_upload_batch_id_key;

-- Agrega la restriccion unica global solo si todavia no existe,
-- para que esta migracion sea segura de correr mas de una vez
-- sin riesgo de fallar o de borrar datos reales por accidente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_asset_number_key'
  ) THEN
    ALTER TABLE assets ADD CONSTRAINT assets_asset_number_key UNIQUE (asset_number);
  END IF;
END $$;