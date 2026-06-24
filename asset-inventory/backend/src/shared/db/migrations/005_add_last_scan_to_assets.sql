-- Agrega columnas de trazabilidad del ultimo escaneo fisico a cada activo.
-- Estas columnas reflejan el estado actual del inventario (la app movil),
-- y son independientes del archivo Excel original que nunca se modifica.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS last_scanned_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_scanned_by       TEXT,
  ADD COLUMN IF NOT EXISTS last_scanned_location  TEXT,
  ADD COLUMN IF NOT EXISTS last_scan_session_id  UUID REFERENCES inventory_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_last_scan_session_id ON assets (last_scan_session_id);

-- Poblar las columnas nuevas con los datos historicos del Excel,
-- usando los campos de "lectura" que ya venian en metadata (JSONB).
--
-- IMPORTANTE: este UPDATE solo aplica a activos que todavia NO tienen
-- trazabilidad real de escaneo (last_scan_session_id IS NULL). Esto es
-- lo que hace que esta migracion sea segura de correr multiples veces
-- sin riesgo de pisar un escaneo real con datos viejos del Excel.
-- Sin esta condicion, cada vez que se corre npm run migrate (por ejemplo
-- al agregar una migracion nueva), este UPDATE volveria a sobrescribir
-- la trazabilidad real de cualquier activo ya escaneado con la app.
--
-- last_scan_session_id se queda en NULL porque esa lectura historica
-- no fue hecha mediante una sesion de esta aplicacion.
-- last_scanned_at se queda en NULL porque el Excel no trae una fecha
-- exacta de esa ultima lectura, solo el nombre y la ubicacion.
UPDATE assets
SET
  last_scanned_by = metadata->>'responsable_lectura',
  last_scanned_location = COALESCE(
    metadata->>'ubicacion_fisica',
    metadata->>'centro_funcional_lectura'
  )
WHERE metadata IS NOT NULL
  AND last_scan_session_id IS NULL
  AND (
    metadata->>'responsable_lectura' IS NOT NULL
    OR metadata->>'ubicacion_fisica' IS NOT NULL
    OR metadata->>'centro_funcional_lectura' IS NOT NULL
  );