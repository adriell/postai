const { Pool } = require('pg');

// Supabase (e outros provedores cloud) exigem SSL.
// Se DATABASE_URL estiver definida, usa ela diretamente.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis:       30_000,
      connectionTimeoutMillis:  5_000,
    }
  : {
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'postai',
      user:     process.env.DB_USER || 'postai_user',
      password: process.env.DB_PASS || 'postai_secret_local',
      max:      10,
      idleTimeoutMillis:       30_000,
      connectionTimeoutMillis:  5_000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool:', err.message);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('[DB] Falha na conexão:', err.message);
    return false;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const dur = Date.now() - start;
    if (dur > 1000) console.warn(`[DB] Query lenta (${dur}ms):`, text.slice(0, 80));
    return res;
  } catch (err) {
    console.error('[DB] Erro na query:', err.message, '\nSQL:', text.slice(0, 120));
    throw err;
  }
}

module.exports = { pool, query, testConnection };
