const pool = require('./db');

const agentRoles = {
  'Goku': 'Squad Lead',
  'Vegeta': 'Tech Lead',
  'Bulma': 'DevOps Engineer',
  'Piccolo': 'System Architect',
  'Gohan': 'Researcher',
  'Trunks': 'Deployment Specialist'
};

const sampleTags = [
  ['frontend', 'ui'],
  ['backend', 'api'],
  ['bug', 'urgent'],
  ['feature', 'v2'],
  ['database', 'optimization'],
  ['docs', 'readme']
];

async function seed() {
  console.log('Seeding V2 data...');
  
  try {
    // Update Agents
    for (const [name, role] of Object.entries(agentRoles)) {
      const res = await pool.query(
        "UPDATE agents SET role = $1 WHERE name = $2 RETURNING *",
        [role, name]
      );
      if (res.rowCount > 0) {
        console.log(`Updated ${name} to role ${role}`);
      } else {
        console.log(`Agent ${name} not found, creating...`);
        await pool.query(
          "INSERT INTO agents (name, role, status) VALUES ($1, $2, 'idle')",
          [name, role]
        );
      }
    }

    // Update Tasks with random tags
    const { rows: tasks } = await pool.query("SELECT id FROM tasks");
    console.log(`Found ${tasks.length} tasks to update.`);
    
    for (const task of tasks) {
      const tags = sampleTags[Math.floor(Math.random() * sampleTags.length)];
      await pool.query(
        "UPDATE tasks SET tags = $1 WHERE id = $2",
        [tags, task.id]
      );
    }
    console.log('Tasks updated with sample tags.');
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
