const pool = require('./db');

async function boot() {
  // Run lightweight column additions on startup
  try {
    await pool.query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS principles TEXT[] DEFAULT '{}';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS critical_actions TEXT[] DEFAULT '{}';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS communication_style TEXT;
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS does TEXT[] DEFAULT '{}';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS does_not TEXT[] DEFAULT '{}';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS bmad_source TEXT;
    `);
    console.log('Profile columns ensured');
  } catch (err) {
    console.error('Auto-migration warning:', err.message);
  }

  const { start } = require('./server');
  start();
}

boot();
