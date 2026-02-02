const chokidar = require('chokidar');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class Watcher extends EventEmitter {
  constructor(rootPath) {
    super();
    this.rootPath = rootPath;
    this.kanbanPath = path.join(rootPath, 'KANBAN.md');
    this.logsPath = '/data/.openclaw/agents/main/sessions';
    
    // Store file sizes to simulate "tail"
    this.fileSizes = {};
  }

  start() {
    console.log(`Watcher starting. Root: ${this.rootPath}`);
    console.log(`Watching logs at: ${this.logsPath}`);

    // Watch KANBAN.md
    this.kanbanWatcher = chokidar.watch(this.kanbanPath, {
      persistent: true,
      ignoreInitial: false // We want to parse it on startup
    });

    this.kanbanWatcher.on('add', () => this.emit('kanban-update', this.kanbanPath));
    this.kanbanWatcher.on('change', () => this.emit('kanban-update', this.kanbanPath));

    // Watch Logs
    this.logWatcher = chokidar.watch(path.join(this.logsPath, '*.jsonl'), {
      persistent: true,
      ignoreInitial: true // Don't stream entire history on startup, only new writes
    });

    this.logWatcher.on('add', (filePath) => this.handleLogUpdate(filePath));
    this.logWatcher.on('change', (filePath) => this.handleLogUpdate(filePath));
    
    console.log("Watchers initialized.");
  }

  handleLogUpdate(filePath) {
    fs.stat(filePath, (err, stats) => {
      if (err) return;

      const prevSize = this.fileSizes[filePath] || 0;
      const newSize = stats.size;

      // If file got smaller (truncated), reset
      if (newSize < prevSize) {
        this.fileSizes[filePath] = newSize;
        return;
      }

      // Read only new bytes
      const stream = fs.createReadStream(filePath, {
        start: prevSize,
        end: newSize
      });

      stream.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        lines.forEach(line => {
            this.emit('log-line', {
                file: path.basename(filePath),
                content: line,
                timestamp: new Date().toISOString()
            });
        });
      });

      stream.on('end', () => {
        this.fileSizes[filePath] = newSize;
      });
    });
  }
}

module.exports = Watcher;
