const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const pool = require('./db');

// Store active SSE clients
let clients = [];

// Register CORS
fastify.register(cors, {
  origin: '*'
});

// Broadcast helper for real-time updates
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// ============ TASKS API ============

// GET /api/tasks - List all tasks
fastify.get('/api/tasks', async (request, reply) => {
  const { status, agent_id } = request.query;
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (agent_id) {
    params.push(agent_id);
    conditions.push(`agent_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(query, params);
  return rows;
});

// POST /api/tasks - Create a task
fastify.post('/api/tasks', async (request, reply) => {
  const { title, description, status = 'backlog', agent_id } = request.body;
  
  if (!title) {
    return reply.status(400).send({ error: 'Title is required' });
  }

  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, status, agent_id) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [title, description || null, status, agent_id || null]
  );

  const task = rows[0];
  broadcast('task-created', task);
  return reply.status(201).send(task);
});

// PUT /api/tasks/:id - Update a task
fastify.put('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;
  const { title, description, status, agent_id } = request.body;

  const { rows } = await pool.query(
    `UPDATE tasks 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         agent_id = COALESCE($4, agent_id),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [title, description, status, agent_id, id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  const task = rows[0];
  broadcast('task-updated', task);
  return task;
});

// DELETE /api/tasks/:id - Delete a task
fastify.delete('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;

  const { rows } = await pool.query(
    'DELETE FROM tasks WHERE id = $1 RETURNING *',
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  broadcast('task-deleted', { id: parseInt(id) });
  return { success: true, deleted: rows[0] };
});

// ============ AGENTS API ============

// GET /api/agents - List all agents
fastify.get('/api/agents', async (request, reply) => {
  const { rows } = await pool.query('SELECT * FROM agents ORDER BY created_at');
  return rows;
});

// POST /api/agents - Create an agent
fastify.post('/api/agents', async (request, reply) => {
  const { name, description, status = 'idle' } = request.body;

  if (!name) {
    return reply.status(400).send({ error: 'Name is required' });
  }

  const { rows } = await pool.query(
    `INSERT INTO agents (name, description, status) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [name, description || null, status]
  );

  const agent = rows[0];
  broadcast('agent-created', agent);
  return reply.status(201).send(agent);
});

// PUT /api/agents/:id - Update an agent
fastify.put('/api/agents/:id', async (request, reply) => {
  const { id } = request.params;
  const { name, description, status } = request.body;

  const { rows } = await pool.query(
    `UPDATE agents 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         status = COALESCE($3, status)
     WHERE id = $4
     RETURNING *`,
    [name, description, status, id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Agent not found' });
  }

  const agent = rows[0];
  broadcast('agent-updated', agent);
  return agent;
});

// ============ MESSAGES API ============

// GET /api/messages - List messages (with optional agent_id filter)
fastify.get('/api/messages', async (request, reply) => {
  const { agent_id, limit = 50 } = request.query;
  
  let query = 'SELECT m.*, a.name as agent_name FROM agent_messages m LEFT JOIN agents a ON m.agent_id = a.id';
  const params = [];

  if (agent_id) {
    params.push(agent_id);
    query += ` WHERE m.agent_id = $${params.length}`;
  }
  
  params.push(parseInt(limit));
  query += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

  const { rows } = await pool.query(query, params);
  return rows;
});

// POST /api/messages - Create a message
fastify.post('/api/messages', async (request, reply) => {
  const { agent_id, message } = request.body;

  if (!message) {
    return reply.status(400).send({ error: 'Message is required' });
  }

  const { rows } = await pool.query(
    `INSERT INTO agent_messages (agent_id, message) 
     VALUES ($1, $2) 
     RETURNING *`,
    [agent_id || null, message]
  );

  const msg = rows[0];
  broadcast('message-created', msg);
  return reply.status(201).send(msg);
});

// ============ BOARD API (for backward compatibility) ============

// GET /api/board - Get kanban board format
fastify.get('/api/board', async (request, reply) => {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY created_at');
  
  // Group by status into columns
  const columns = [
    { title: 'Backlog', status: 'backlog', cards: [] },
    { title: 'To Do', status: 'todo', cards: [] },
    { title: 'In Review', status: 'review', cards: [] },
    { title: 'Completed', status: 'completed', cards: [] }
  ];

  rows.forEach(task => {
    const column = columns.find(c => c.status === task.status);
    if (column) {
      column.cards.push({
        id: task.id,
        text: task.title,
        description: task.description,
        status: task.status,
        agent_id: task.agent_id
      });
    }
  });

  return { columns };
});

// ============ SSE STREAM ============

// SSE Endpoint for real-time updates
fastify.get('/api/stream', (req, res) => {
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  clients.push(res.raw);
  console.log(`Client connected. Total: ${clients.length}`);

  // Send initial data
  Promise.all([
    pool.query('SELECT * FROM tasks ORDER BY created_at'),
    pool.query('SELECT * FROM agents ORDER BY created_at')
  ]).then(([tasksResult, agentsResult]) => {
    res.raw.write(`event: init\ndata: ${JSON.stringify({
      tasks: tasksResult.rows,
      agents: agentsResult.rows
    })}\n\n`);
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.raw.write(`:heartbeat\n\n`);
  }, 30000);

  req.raw.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(c => c !== res.raw);
    console.log(`Client disconnected. Total: ${clients.length}`);
  });
});

// ============ HEALTH CHECK ============

fastify.get('/health', async (request, reply) => {
  try {
    await pool.query('SELECT 1');
    return { status: 'healthy', database: 'connected' };
  } catch (err) {
    return reply.status(500).send({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// Start Server
const start = async () => {
  try {
    const PORT = process.env.PORT || 3001;
    
    // Verify database connection
    await pool.query('SELECT 1');
    console.log('Database connection verified');
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

module.exports = { start };
