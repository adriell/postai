-- Migration 001: adiciona campos de agendamento à tabela generations
-- Executar manualmente no banco (Supabase SQL Editor ou psql)

ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS scheduled_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_status TEXT
    CHECK (schedule_status IN ('pending', 'sent', 'cancelled'));

CREATE INDEX IF NOT EXISTS generations_schedule_idx
  ON generations (scheduled_at)
  WHERE schedule_status = 'pending';
