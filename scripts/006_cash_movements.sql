-- Tabla para movimientos de caja (ingresos manuales y egresos)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_movements (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('income', 'egreso')),
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  concept     text NOT NULL,
  method      text, -- cash | mercadopago | transfer
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id)
);

-- Índice para buscar por venue + fecha
CREATE INDEX IF NOT EXISTS cash_movements_venue_date_idx
  ON cash_movements (venue_id, created_at);

-- RLS: el dueño solo ve sus propios movimientos
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_cash_movements" ON cash_movements
  FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE owner_id = auth.uid()
    )
  );
