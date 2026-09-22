const fs = require('fs');

/**
 * Parses an environment file into structured entries and key-value mapping.
 * Handles comments, inline comments, exports, quotes, and empty lines.
 */
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const entries = [];
  const map = new Map();
  const duplicates = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Empty line or comment line
    if (!trimmed || trimmed.startsWith('#')) {
      entries.push({
        type: trimmed.startsWith('#') ? 'comment' : 'empty',
        raw: line,
        lineNum
      });
      return;
    }

    // Strip optional leading 'export '
    let cleanLine = trimmed;
    if (cleanLine.startsWith('export ')) {
      cleanLine = cleanLine.slice(7).trim();
    }

    // Match KEY=VALUE
    const match = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      entries.push({
        type: 'invalid',
        raw: line,
        lineNum,
        error: 'Invalid variable syntax'
      });
      return;
    }

    const key = match[1];
    let val = match[2];

    // Check duplicate
    if (map.has(key)) {
      duplicates.push({ key, lineNum, previousLine: map.get(key).lineNum });
    }

    // Handle quoted values vs inline comments
    let value = val;
    let comment = '';

    if (val.startsWith('"')) {
      const endQuote = val.indexOf('"', 1);
      if (endQuote !== -1) {
        value = val.slice(1, endQuote);
        comment = val.slice(endQuote + 1).trim();
      } else {
        value = val.slice(1); // unclosed quote
      }
    } else if (val.startsWith("'")) {
      const endQuote = val.indexOf("'", 1);
      if (endQuote !== -1) {
        value = val.slice(1, endQuote);
        comment = val.slice(endQuote + 1).trim();
      } else {
        value = val.slice(1);
      }
    } else {
      // Split inline comment if any
      const hashIndex = val.indexOf('#');
      if (hashIndex !== -1) {
        comment = val.slice(hashIndex).trim();
        value = val.slice(0, hashIndex).trim();
      } else {
        value = val.trim();
      }
    }

    const entry = {
      type: 'var',
      key,
      value,
      raw: line,
      lineNum,
      comment
    };

    entries.push(entry);
    map.set(key, entry);
  });

  return { entries, map, duplicates };
}

module.exports = { parseEnv };
