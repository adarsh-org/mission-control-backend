const pool = require('../db');

async function migrate() {
  console.log('Running migration v3: Add mentioned_agent_ids to agent_messages...');
  
  await pool.query(`
    ALTER TABLE agent_messages 
    ADD COLUMN IF NOT EXISTS mentioned_agent_ids INTEGER[] DEFAULT '{}'
  `);
  
  console.log('Migration v3 complete');
}

module.exports = { migrate };

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
