const fs = require('fs');
const path = require('path');
const { parseEnv } = require('./parser');

/**
 * Compare two env files and produce differences
 */
function diffEnvs(fileA, fileB) {
  if (!fs.existsSync(fileA)) throw new Error(`File not found: ${fileA}`);
  if (!fs.existsSync(fileB)) throw new Error(`File not found: ${fileB}`);

  const parsedA = parseEnv(fileA);
  const parsedB = parseEnv(fileB);

  const keysA = new Set(parsedA.map.keys());
  const keysB = new Set(parsedB.map.keys());

  const onlyInA = [];
  const onlyInB = [];
  const bothSame = [];
  const bothDifferent = [];

  for (const [key, entryA] of parsedA.map.entries()) {
    if (!keysB.has(key)) {
      onlyInA.push(key);
    } else {
      const entryB = parsedB.map.get(key);
      if (entryA.value === entryB.value) {
        bothSame.push({ key, value: entryA.value });
      } else {
        bothDifferent.push({
          key,
          valA: entryA.value,
          valB: entryB.value
        });
      }
    }
  }

  for (const key of keysB) {
    if (!keysA.has(key)) {
      onlyInB.push(key);
    }
  }

  return {
    fileA: path.basename(fileA),
    fileB: path.basename(fileB),
    onlyInA,
    onlyInB,
    bothSame,
    bothDifferent
  };
}

module.exports = { diffEnvs };
