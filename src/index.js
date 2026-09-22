const { parseEnv } = require('./parser');
const { validateProject } = require('./validator');
const { generateExample } = require('./generator');
const { diffEnvs } = require('./diff');

module.exports = {
  parseEnv,
  validateProject,
  generateExample,
  diffEnvs
};
