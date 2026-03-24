-- ─────────────────────────────────────────────────────────────
--  PostAI — schema inicial
--  Executado automaticamente na primeira criação do container
-- ─────────────────────────────────────────────────────────────

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabela: users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT,                        -- null se OAuth futuro
  plan          TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free','starter','pro','agency')),
  credits               INTEGER     NOT NULL DEFAULT 5,
  email_verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  email_verify_token    TEXT,
  email_verify_expires  TIMESTAMPTZ,
  reset_token           TEXT,
  reset_expires         TIMESTAMPTZ,
  is_admin              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_idx  ON sessions(user_id);

-- ── Tabela: generations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS generations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nicho       TEXT        NOT NULL,
  tone        TEXT        NOT NULL,
  language    TEXT        NOT NULL DEFAULT 'pt-BR',
  extra_info  TEXT,
  caption     TEXT,
  hashtags    TEXT[],
  image_url   TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','done','error')),
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generations_user_idx ON generations(user_id);
CREATE INDEX IF NOT EXISTS generations_created_idx ON generations(created_at DESC);

-- ── Tabela: subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','cancelled','past_due')),
  stripe_id    TEXT,                        -- preenchido após integrar Stripe
  renews_at    TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);

-- ── Tabela: credits_log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS credits_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta       INTEGER     NOT NULL,          -- negativo = consumo, positivo = recarga
  reason      TEXT        NOT NULL,          -- 'generation', 'plan_upgrade', 'manual', etc
  ref_id      UUID,                          -- id da generation relacionada
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credits_log_user_idx ON credits_log(user_id);

-- ── Função: decrementar crédito atomicamente ─────────────────
CREATE OR REPLACE FUNCTION use_credit(p_user_id UUID, p_ref_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits
  FROM users WHERE id = p_user_id
  FOR UPDATE;

  IF current_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE users SET credits = credits - 1, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO credits_log (user_id, delta, reason, ref_id)
  VALUES (p_user_id, -1, 'generation', p_ref_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ── Usuário de teste ─────────────────────────────────────────
INSERT INTO users (email, name, password_hash, plan, credits, email_verified, is_admin)
VALUES (
  'dev@postai.local',
  'Dev User',
  crypt('dev123456', gen_salt('bf')),
  'pro',
  999,
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE users        IS 'Usuários da plataforma PostAI';
COMMENT ON TABLE generations  IS 'Histórico de conteúdos gerados';
COMMENT ON TABLE subscriptions IS 'Assinaturas dos planos';
COMMENT ON TABLE credits_log  IS 'Auditoria de uso e recarga de créditos';
