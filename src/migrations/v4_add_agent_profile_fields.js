const pool = require('../db');

async function migrate() {
  console.log('Running migration v4: Add agent profile fields...');
  
  await pool.query(`
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS principles TEXT[] DEFAULT '{}';
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS critical_actions TEXT[] DEFAULT '{}';
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS communication_style TEXT;
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS does TEXT[] DEFAULT '{}';
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS does_not TEXT[] DEFAULT '{}';
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS bmad_source TEXT;
  `);
  
  console.log('Migration v4 complete');
}

module.exports = { migrate };

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
