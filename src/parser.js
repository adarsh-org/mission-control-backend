const fs = require('fs');

function parseKanban(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const board = { columns: [] };
    let currentColumn = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Detect Column Headers (## Title)
      if (trimmed.startsWith('## ')) {
        if (currentColumn) {
          board.columns.push(currentColumn);
        }
        currentColumn = {
            title: trimmed.replace(/^##\s+/, '').trim(), // Remove '## ' and potential emojis
            cards: []
        };
      } 
      // Detect List Items (- [ ] or - [x] or - [/])
      else if (trimmed.startsWith('- [') && currentColumn) {
        // Extract status
        const statusMatch = trimmed.match(/^-\s\[([ xX/])\]\s(.*)/);
        if (statusMatch) {
            const rawStatus = statusMatch[1].toLowerCase();
            const text = statusMatch[2].trim();
            
            let status = 'todo';
            if (rawStatus === 'x') status = 'done';
            if (rawStatus === '/') status = 'in-progress';

            currentColumn.cards.push({
                text: text,
                status: status,
                raw: line
            });
        }
      }
      // Simple list items under "Active Delegations" might not have check boxes, handle generic lists if needed
      // For now, adhering to checkbox logic as primary "cards"
      else if (trimmed.startsWith('- ') && currentColumn && !trimmed.startsWith('- [')) {
          // Treat non-checkbox list items as simple cards if we want
          currentColumn.cards.push({
              text: trimmed.replace(/^-\s/, '').trim(),
              status: 'info',
              raw: line
          });
      }
    });

    // Push the last column
    if (currentColumn) {
      board.columns.push(currentColumn);
    }

    return board;
  } catch (err) {
    console.error("Error parsing Kanban:", err);
    return { columns: [], error: err.message };
  }
}

module.exports = { parseKanban };
