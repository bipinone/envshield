const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseEnv } = require('./parser');

// Known secret signatures to prevent committing live credentials
const SECRET_PATTERNS = [
  { name: 'AWS Access Key ID', regex: /^AKIA[0-9A-Z]{16}$/ },
  { name: 'Google / Gemini API Key', regex: /^AIza[0-9A-Za-z-_]{35}$/ },
  { name: 'Anthropic Claude API Key', regex: /^sk-ant-[a-zA-Z0-9_-]{20,}$/ },
  { name: 'OpenAI API Key', regex: /^sk-[a-zA-Z0-9_-]{20,}$/ },
  { name: 'GitHub Personal Access Token', regex: /^(gh[pousr]_[A-Za-z0-9_]{36,255}|github_pat_[A-Za-z0-9_]{60,100})$/ },
  { name: 'Slack Bot / Webhook Token', regex: /^xox[baprs]-[0-9a-zA-Z-]+$/ },
  { name: 'Stripe Secret Key', regex: /^sk_(live|test)_[0-9a-zA-Z]{24,}$/ },
  { name: 'Generic Private Key', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----/ },
  { name: 'High-entropy JWT', regex: /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/ }
];

/**
 * Checks if a string looks like a placeholder rather than a real secret
 */
function isPlaceholder(value) {
  if (!value) return true;
  const v = value.toLowerCase().trim();
  if (
    (v.startsWith('<') && v.endsWith('>')) ||
    (v.startsWith('{') && v.endsWith('}')) ||
    (v.startsWith('[') && v.endsWith(']'))
  ) {
    return true;
  }

  const placeholderKeywords = [
    'your_', '_here', 'example', 'dummy', 'sample', 'changeme',
    'replace_me', 'todo', 'fake_secret', 'xxxx'
  ];

  return placeholderKeywords.some((p) => v.includes(p)) || v === 'secret' || v === 'test' || v === 'null';
}

/**
 * Checks if .env is properly ignored in .gitignore
 */
function checkGitIgnore(baseDir) {
  const gitignorePath = path.join(baseDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return {
      hasGitignore: false,
      isEnvIgnored: false,
      reason: 'No .gitignore file found in project root'
    };
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lines = content.split(/\r?\n/).map((l) => l.trim());

  const isEnvIgnored = lines.some((line) => {
    if (!line || line.startsWith('#')) return false;
    return (
      line === '.env' ||
      line === '.env*' ||
      line === '*.env' ||
      line === '.env.local' ||
      line.startsWith('.env')
    );
  });

  return {
    hasGitignore: true,
    isEnvIgnored,
    reason: isEnvIgnored
      ? 'Environment files are tracked in .gitignore'
      : '.env file is NOT ignored in .gitignore! Secrets might be leaked.'
  };
}

/**
 * Checks if git is currently tracking .env in git index
 */
function isTrackedByGit(baseDir, fileName = '.env') {
  try {
    // Cross-platform git check
    execSync(`git ls-files --error-unmatch "${fileName}"`, {
      cwd: baseDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-fix: appends safe .env patterns to .gitignore
 */
function fixGitIgnore(baseDir) {
  const gitignorePath = path.join(baseDir, '.gitignore');
  const rules = [
    '',
    '# Environment files (Added by EnvShield)',
    '.env',
    '.env.local',
    '.env.*.local',
    '!.env.example'
  ].join('\n') + '\n';

  if (fs.existsSync(gitignorePath)) {
    fs.appendFileSync(gitignorePath, rules, 'utf-8');
  } else {
    fs.writeFileSync(gitignorePath, rules.trimStart(), 'utf-8');
  }
  return true;
}

/**
 * Validates common environment variable formats and types
 */
function validateVariableValue(key, value) {
  const issues = [];
  const upper = key.toUpperCase();

  // Port check
  if (upper === 'PORT' || upper.endsWith('_PORT')) {
    if (value && !isPlaceholder(value)) {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        issues.push(`Invalid port number "${value}". Expected integer between 1 and 65535.`);
      }
    }
  }

  // Boolean flags check
  const isBoolKey = (
    upper.startsWith('ENABLE_') ||
    upper.startsWith('DISABLE_') ||
    upper.startsWith('IS_') ||
    upper.startsWith('HAS_') ||
    upper.startsWith('ALLOW_') ||
    upper === 'DEBUG'
  );
  if (isBoolKey && value && !isPlaceholder(value)) {
    const valLower = value.toLowerCase().trim();
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(valLower)) {
      issues.push(`Invalid boolean value "${value}". Expected true, false, 1, or 0.`);
    }
  }

  // URL format check
  if ((upper.endsWith('_URL') || upper.endsWith('_URI')) && value && !isPlaceholder(value)) {
    if (!value.includes('://')) {
      issues.push(`URL value "${value}" is missing protocol scheme (e.g. https://, postgres://).`);
    }
  }

  return issues;
}

/**
 * Validates env and env.example comparison, secrets, and syntax
 */
function validateProject(baseDir, options = {}) {
  const results = {
    errors: [],
    warnings: [],
    info: [],
    filesFound: []
  };

  // Git index tracking check
  if (isTrackedByGit(baseDir, '.env')) {
    results.errors.push({
      type: 'ENV_TRACKED_IN_GIT',
      file: '.env',
      message: 'CRITICAL: .env is already tracked in Git history! Even if in .gitignore, run `git rm --cached .env` to remove it from Git index.'
    });
  }

  const gitignoreCheck = checkGitIgnore(baseDir);
  if (!gitignoreCheck.hasGitignore) {
    if (options.fix) {
      fixGitIgnore(baseDir);
      results.info.push({
        type: 'GITIGNORE_FIXED',
        message: 'Created .gitignore and added environment ignore rules.'
      });
    } else {
      results.warnings.push({
        type: 'GITIGNORE_MISSING',
        message: 'No .gitignore found! Run `envshield check --fix` to create one automatically.'
      });
    }
  } else if (!gitignoreCheck.isEnvIgnored) {
    if (options.fix) {
      fixGitIgnore(baseDir);
      results.info.push({
        type: 'GITIGNORE_FIXED',
        message: 'Appended .env rules to existing .gitignore.'
      });
    } else {
      results.errors.push({
        type: 'ENV_NOT_IGNORED',
        message: '.env is not ignored in .gitignore! Run `envshield check --fix` to fix this automatically.'
      });
    }
  }

  // Find candidate env files
  const candidates = ['.env', '.env.local', '.env.development', '.env.production', '.env.staging', '.env.test'];
  const exampleCandidates = ['.env.example', '.env.sample', '.env.template'];

  let activeEnvFile = null;
  let activeExampleFile = null;

  for (const f of candidates) {
    const full = path.join(baseDir, f);
    if (fs.existsSync(full)) {
      results.filesFound.push(f);
      if (!activeEnvFile && f === '.env') activeEnvFile = full;
    }
  }

  for (const f of exampleCandidates) {
    const full = path.join(baseDir, f);
    if (fs.existsSync(full)) {
      results.filesFound.push(f);
      if (!activeExampleFile) activeExampleFile = full;
    }
  }

  if (!activeEnvFile && results.filesFound.length > 0) {
    activeEnvFile = path.join(baseDir, results.filesFound[0]);
  }

  if (!activeEnvFile && !activeExampleFile) {
    results.errors.push({
      type: 'NO_ENV_FILES',
      message: 'No .env or .env.example files found in directory.'
    });
    return results;
  }

  let envData = null;
  let exampleData = null;

  if (activeEnvFile) {
    envData = parseEnv(activeEnvFile);

    // Check duplicates
    for (const dup of envData.duplicates) {
      results.warnings.push({
        type: 'DUPLICATE_KEY',
        file: path.basename(activeEnvFile),
        message: `Duplicate key '${dup.key}' found on line ${dup.lineNum} (first defined on line ${dup.previousLine})`
      });
    }

    // Check syntax errors & type validity
    for (const entry of envData.entries) {
      if (entry.type === 'invalid') {
        results.errors.push({
          type: 'SYNTAX_ERROR',
          file: path.basename(activeEnvFile),
          message: `Line ${entry.lineNum}: "${entry.raw}" is invalid syntax`
        });
      } else if (entry.type === 'var') {
        const typeErrors = validateVariableValue(entry.key, entry.value);
        for (const te of typeErrors) {
          results.warnings.push({
            type: 'TYPE_FORMAT_WARNING',
            file: path.basename(activeEnvFile),
            message: `Line ${entry.lineNum} (${entry.key}): ${te}`
          });
        }
      }
    }
  }

  if (activeExampleFile) {
    exampleData = parseEnv(activeExampleFile);

    // Check for exposed secrets inside the example file (critical mistake!)
    for (const [key, entry] of exampleData.map.entries()) {
      if (!isPlaceholder(entry.value)) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(entry.value)) {
            results.errors.push({
              type: 'LEAKED_SECRET_IN_EXAMPLE',
              file: path.basename(activeExampleFile),
              message: `Potential live ${pattern.name} found in example file for key '${key}' on line ${entry.lineNum}!`
            });
          }
        }
      }
    }
  }

  // Cross-compare .env and .env.example
  if (envData && exampleData) {
    const envKeys = new Set(envData.map.keys());
    const exampleKeys = new Set(exampleData.map.keys());

    // Keys present in .env but missing in .env.example
    for (const key of envKeys) {
      if (!exampleKeys.has(key)) {
        results.warnings.push({
          type: 'MISSING_IN_EXAMPLE',
          file: path.basename(activeExampleFile),
          message: `Key '${key}' is defined in ${path.basename(activeEnvFile)} but missing in ${path.basename(activeExampleFile)}`
        });
      }
    }

    // Keys present in .env.example but missing in .env
    for (const key of exampleKeys) {
      if (!envKeys.has(key)) {
        results.errors.push({
          type: 'MISSING_IN_ENV',
          file: path.basename(activeEnvFile),
          message: `Key '${key}' required by ${path.basename(activeExampleFile)} is missing in ${path.basename(activeEnvFile)}`
        });
      }
    }
  } else if (envData && !exampleData) {
    results.warnings.push({
      type: 'EXAMPLE_FILE_MISSING',
      message: 'No .env.example file found! Run `envshield gen` to generate one automatically.'
    });
  }

  return results;
}

module.exports = {
  validateProject,
  validateVariableValue,
  fixGitIgnore,
  SECRET_PATTERNS,
  isPlaceholder,
  checkGitIgnore,
  isTrackedByGit
};
