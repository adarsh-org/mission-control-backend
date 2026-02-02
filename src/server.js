const fastify = require('fastify')({ logger: true });
const path = require('path');
const cors = require('@fastify/cors');
const Watcher = require('./watcher');
const { parseKanban } = require('./parser');

const WORKSPACE_ROOT = path.join(__dirname, '../../');
const watcher = new Watcher(WORKSPACE_ROOT);

// Store active SSE clients
let clients = [];

// Register CORS
fastify.register(cors, {
  origin: '*' // Adjust for production security later
});

// Broadcast helper
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// Watcher Events
watcher.on('kanban-update', (filePath) => {
  console.log('Kanban updated, broadcasting...');
  const board = parseKanban(filePath);
  broadcast('kanban', board);
});

watcher.on('log-line', (data) => {
  broadcast('log', data);
});

// API Routes
fastify.get('/api/board', async (request, reply) => {
  const board = parseKanban(path.join(WORKSPACE_ROOT, 'KANBAN.md'));
  return board;
});

// SSE Endpoint
fastify.get('/api/stream', (req, res) => {
  // Set headers for SSE
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Add client to pool
  clients.push(res.raw);
  console.log(`Client connected. Total: ${clients.length}`);

  // Send initial state immediately
  const board = parseKanban(path.join(WORKSPACE_ROOT, 'KANBAN.md'));
  res.raw.write(`event: kanban\ndata: ${JSON.stringify(board)}\n\n`);

  // Remove client on close
  req.raw.on('close', () => {
    clients = clients.filter(c => c !== res.raw);
    console.log(`Client disconnected. Total: ${clients.length}`);
  });
});

// Start Server
const start = async () => {
  try {
    const PORT = process.env.PORT || 3001;
    watcher.start();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

module.exports = { start };
