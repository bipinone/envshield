#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('../src/colors');
const { validateProject } = require('../src/validator');
const { generateExample } = require('../src/generator');
const { diffEnvs } = require('../src/diff');

const pkg = require('../package.json');

function printBanner() {
  console.log(`
  ${c.cyan(c.bold('🛡️  EnvShield'))} ${c.dim(`v${pkg.version}`)}
  ${c.dim('Smart environment auditor, secret scanner & sync manager')}
`);
}

function printHelp() {
  printBanner();
  console.log(`
${c.bold('USAGE:')}
  ${c.green('envshield')} [command] [options]

${c.bold('COMMANDS:')}
  ${c.green('check')}               Audit environment files in target project ${c.dim('(default)')}
  ${c.green('generate, gen')}       Create safe .env.example from existing .env automatically
  ${c.green('diff <file1> <file2>')} Compare keys and values between two environment files
  ${c.green('help')}                Show this help message

${c.bold('OPTIONS:')}
  ${c.cyan('-d, --dir <path>')}     Specify project directory (defaults to current dir)
  ${c.cyan('--fix')}                Automatically repair missing .gitignore rules
  ${c.cyan('--json')}               Output audit results in JSON format (for CI/CD pipelines)
  ${c.cyan('--strict')}             Treat warnings as errors (exits with 1)
  ${c.cyan('-f, --force')}          Overwrite existing .env.example when generating
  ${c.cyan('-v, --version')}        Show version
  ${c.cyan('-h, --help')}           Show help

${c.bold('EXAMPLES:')}
  $ npx envshield check
  $ npx envshield check --fix
  $ npx envshield check --json
  $ npx envshield gen --force
  $ npx envshield diff .env.local .env.production
`);
}

function runCheck(projectDir, flags) {
  const results = validateProject(projectDir, { fix: flags.fix });

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    if (results.errors.length > 0 || (flags.strict && results.warnings.length > 0)) {
      process.exit(1);
    }
    process.exit(0);
  }

  printBanner();
  console.log(`${c.dim('🔍 Scanning project at:')} ${c.bold(projectDir)}\n`);

  if (results.filesFound.length > 0) {
    console.log(`  ${c.dim('Files detected:')} ${results.filesFound.map((f) => c.cyan(f)).join(', ')}\n`);
  }

  let hasErrors = results.errors.length > 0;
  let hasWarnings = results.warnings.length > 0;

  if (results.info && results.info.length > 0) {
    console.log(`${c.green(c.bold('  ✔ AUTO-FIXES APPLIED:'))}`);
    results.info.forEach((item) => {
      console.log(`    ${c.green('•')} ${item.message}`);
    });
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log(`${c.red(c.bold('  ✖ ISSUES FOUND:'))}`);
    results.errors.forEach((err) => {
      const prefix = err.file ? `[${c.bold(err.file)}] ` : '';
      console.log(`    ${c.red('•')} ${prefix}${err.message}`);
    });
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log(`${c.yellow(c.bold('  ⚠ WARNINGS:'))}`);
    results.warnings.forEach((warn) => {
      const prefix = warn.file ? `[${c.bold(warn.file)}] ` : '';
      console.log(`    ${c.yellow('•')} ${prefix}${warn.message}`);
    });
    console.log('');
  }

  if (!hasErrors && !hasWarnings) {
    console.log(`${c.green('  ✔ All checks passed!')} Your environment files are in sync & secure.\n`);
    process.exit(0);
  } else if (hasErrors) {
    console.log(`${c.red('  Audit failed.')} Please fix the critical issues above.\n`);
    process.exit(1);
  } else if (flags.strict && hasWarnings) {
    console.log(`${c.red('  Audit failed in strict mode due to warnings.')}\n`);
    process.exit(1);
  } else {
    console.log(`${c.yellow('  Audit finished with warnings.')}\n`);
    process.exit(0);
  }
}

function runGenerate(projectDir, flags) {
  printBanner();
  const sourcePath = path.join(projectDir, '.env');
  const targetPath = path.join(projectDir, '.env.example');

  if (!fs.existsSync(sourcePath)) {
    console.error(`${c.red('✖ Error:')} .env file not found in ${projectDir}`);
    process.exit(1);
  }

  if (fs.existsSync(targetPath) && !flags.force) {
    console.warn(`${c.yellow('⚠ Warning:')} .env.example already exists!`);
    console.warn(`  Use ${c.cyan('--force')} to overwrite it.`);
    process.exit(1);
  }

  try {
    generateExample(sourcePath, targetPath);
    console.log(`${c.green('✔ Successfully generated')} ${c.bold('.env.example')}!`);
    console.log(`  ${c.dim('All sensitive keys have been safely masked with placeholders.')}\n`);
  } catch (err) {
    console.error(`${c.red('✖ Failed to generate:')} ${err.message}`);
    process.exit(1);
  }
}

function runDiff(file1, file2) {
  printBanner();
  if (!file1 || !file2) {
    console.error(`${c.red('✖ Error:')} Please provide two env files to compare.`);
    console.log(`  Example: ${c.cyan('envshield diff .env .env.example')}\n`);
    process.exit(1);
  }

  try {
    const diff = diffEnvs(file1, file2);
    console.log(`${c.bold('Comparing:')} ${c.cyan(diff.fileA)} vs ${c.magenta(diff.fileB)}\n`);

    if (diff.onlyInA.length > 0) {
      console.log(`${c.yellow(`Only in ${diff.fileA} (${diff.onlyInA.length}):`)}`);
      diff.onlyInA.forEach((k) => console.log(`  ${c.red('-')} ${k}`));
      console.log('');
    }

    if (diff.onlyInB.length > 0) {
      console.log(`${c.yellow(`Only in ${diff.fileB} (${diff.onlyInB.length}):`)}`);
      diff.onlyInB.forEach((k) => console.log(`  ${c.green('+')} ${k}`));
      console.log('');
    }

    if (diff.bothDifferent.length > 0) {
      console.log(`${c.blue(`Differing Values (${diff.bothDifferent.length}):`)}`);
      diff.bothDifferent.forEach((item) => {
        console.log(`  ${c.bold(item.key)}:`);
        console.log(`    ${diff.fileA}: ${c.dim(item.valA)}`);
        console.log(`    ${diff.fileB}: ${c.dim(item.valB)}`);
      });
      console.log('');
    }

    if (diff.onlyInA.length === 0 && diff.onlyInB.length === 0 && diff.bothDifferent.length === 0) {
      console.log(`${c.green('✔ Files have identical keys and values!')}\n`);
    }
  } catch (err) {
    console.error(`${c.red('✖ Diff failed:')} ${err.message}`);
    process.exit(1);
  }
}

// Main CLI dispatch
function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    printHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
    console.log(pkg.version);
    return;
  }

  // Parse project dir
  let projectDir = process.cwd();
  const dirIndex = args.findIndex((a) => a === '-d' || a === '--dir');
  if (dirIndex !== -1 && args[dirIndex + 1]) {
    projectDir = path.resolve(args[dirIndex + 1]);
  }

  const flags = {
    force: args.includes('-f') || args.includes('--force'),
    fix: args.includes('--fix'),
    json: args.includes('--json'),
    strict: args.includes('--strict')
  };

  const command = args[0] && !args[0].startsWith('-') ? args[0] : 'check';

  switch (command) {
    case 'check':
      runCheck(projectDir, flags);
      break;
    case 'gen':
    case 'generate':
      runGenerate(projectDir, flags);
      break;
    case 'diff':
      runDiff(args[1], args[2]);
      break;
    default:
      console.error(`${c.red('Unknown command:')} ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
