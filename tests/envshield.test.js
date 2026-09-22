const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { parseEnv } = require('../src/parser');
const { validateProject, isPlaceholder } = require('../src/validator');
const { generateExample, getPlaceholderValue } = require('../src/generator');
const { diffEnvs } = require('../src/diff');

describe('EnvShield Test Suite', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envshield-test-'));

  test('parseEnv: correctly parses keys, values, quotes and comments', () => {
    const filePath = path.join(tmpDir, '.env.test-parse');
    const content = `
# Server configuration
PORT=8080 # default port
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
API_KEY='sk-test-12345'
EMPTY_VAL=
`;
    fs.writeFileSync(filePath, content, 'utf-8');

    const { map, duplicates } = parseEnv(filePath);
    assert.strictEqual(map.get('PORT').value, '8080');
    assert.strictEqual(map.get('DATABASE_URL').value, 'postgresql://user:pass@localhost:5432/mydb');
    assert.strictEqual(map.get('API_KEY').value, 'sk-test-12345');
    assert.strictEqual(map.get('EMPTY_VAL').value, '');
    assert.strictEqual(duplicates.length, 0);
  });

  test('parseEnv: detects duplicate keys', () => {
    const filePath = path.join(tmpDir, '.env.test-dup');
    const content = `
APP_NAME=First
APP_NAME=Second
`;
    fs.writeFileSync(filePath, content, 'utf-8');
    const { duplicates } = parseEnv(filePath);
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].key, 'APP_NAME');
  });

  test('generateExample: masks secrets and retains comments', () => {
    const sourcePath = path.join(tmpDir, '.env.source');
    const targetPath = path.join(tmpDir, '.env.example-generated');
    const content = `
# Database
PORT=3000
DATABASE_URL=postgresql://realadmin:supersecret@db.prod.com:5432/proddb
STRIPE_SECRET_KEY=my_mock_stripe_key_val
`;
    fs.writeFileSync(sourcePath, content, 'utf-8');
    generateExample(sourcePath, targetPath);

    const generated = fs.readFileSync(targetPath, 'utf-8');
    assert.ok(generated.includes('PORT=3000'));
    assert.ok(generated.includes('DATABASE_URL=postgresql://user:password@localhost:5432/my_database'));
    assert.ok(generated.includes('STRIPE_SECRET_KEY=your_stripe_secret_key_here'));
    assert.ok(!generated.includes('supersecret'));
  });

  test('isPlaceholder: accurately identifies safe placeholders', () => {
    assert.strictEqual(isPlaceholder('<your_api_key>'), true);
    assert.strictEqual(isPlaceholder('your_token_here'), true);
    assert.strictEqual(isPlaceholder('dummy_val'), true);
    assert.strictEqual(isPlaceholder('my_production_raw_token_xyz123'), false);
  });

  test('diffEnvs: detects differences between two files', () => {
    const fileA = path.join(tmpDir, '.env.a');
    const fileB = path.join(tmpDir, '.env.b');

    fs.writeFileSync(fileA, 'FOO=bar\nSAME=123\nONLY_A=yes\n');
    fs.writeFileSync(fileB, 'FOO=baz\nSAME=123\nONLY_B=yes\n');

    const diff = diffEnvs(fileA, fileB);
    assert.deepStrictEqual(diff.onlyInA, ['ONLY_A']);
    assert.deepStrictEqual(diff.onlyInB, ['ONLY_B']);
    assert.strictEqual(diff.bothDifferent.length, 1);
    assert.strictEqual(diff.bothDifferent[0].key, 'FOO');
    assert.strictEqual(diff.bothSame.length, 1);
    assert.strictEqual(diff.bothSame[0].key, 'SAME');
  });

  test('validateProject: flags missing keys and secret leaks', () => {
    const projDir = path.join(tmpDir, 'mock-project');
    fs.mkdirSync(projDir);

    fs.writeFileSync(path.join(projDir, '.gitignore'), 'node_modules\n'); // .env is missing!
    fs.writeFileSync(path.join(projDir, '.env'), 'SECRET_TOKEN=real_token\nMISSING_IN_EXAMPLE=123\n');
    fs.writeFileSync(path.join(projDir, '.env.example'), 'SECRET_TOKEN=your_token\nMISSING_IN_ENV=abc\n');

    const results = validateProject(projDir);
    assert.ok(results.errors.some((e) => e.type === 'ENV_NOT_IGNORED'));
    assert.ok(results.errors.some((e) => e.type === 'MISSING_IN_ENV'));
    assert.ok(results.warnings.some((w) => w.type === 'MISSING_IN_EXAMPLE'));
  });
});
