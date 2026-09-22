<div align="center">

# 🛡️ EnvShield

**Zero-dependency CLI tool to audit `.env` files, prevent secret leaks, and keep `.env.example` in sync.**

[![CI](https://github.com/bipinone/envshield/actions/workflows/ci.yml/badge.svg)](https://github.com/bipinone/envshield/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](#)

</div>

---

## ⚡ Why EnvShield?

Every developer has faced these issues at least once:
1. **Broken Builds / Missing Keys**: A teammate added a new environment variable in `.env` but forgot to update `.env.example`.
2. **Accidental Leaks**: `.env` was not added to `.gitignore` and live credentials got committed to GitHub.
3. **Manual Hassle**: Manually sanitizing 40+ lines of `.env` just to create `.env.example`.

**EnvShield** solves all of this in seconds with **zero external dependencies**!

---

## 🚀 Features

- 🔍 **Instant Audit**: Detects missing keys between `.env` and `.env.example`.
- 🚨 **Secret Leak Prevention**: Checks if `.env` is properly ignored in `.gitignore`.
- 🔑 **Pattern Detector**: Catches live OpenAI, AWS, Stripe, Slack, and private keys exposed in public files.
- ⚡ **Auto-Generate `.env.example`**: One command generates `.env.example` with safe dummy placeholders while keeping comments intact.
- 📊 **Diff Utility**: Compare environment variables across environments (e.g. `.env.local` vs `.env.production`).
- 🪶 **Zero Dependencies**: Pure Node.js standard library — runs instantly with no bloated `node_modules`.
- 🤖 **CI/CD Ready**: Returns non-zero exit codes on errors, perfect for GitHub Actions pre-commit checks.

---

## 📦 Quick Start

Run directly without installing via `npx`:

```bash
# Check current directory
npx envshield check

# Generate safe .env.example from .env
npx envshield gen

# Compare two env files
npx envshield diff .env .env.example
```

Or install globally:

```bash
npm install -g envshield
envshield --help
```

---

## 💻 CLI Commands

### 1. `check` (Default)
Audits the current project:
```bash
envshield check
```
Sample Output:
```text
  🛡️  EnvShield v1.0.0
  Smart environment file auditor, secret scanner & sync manager

🔍 Scanning project at: /my-awesome-project

  Files detected: .env, .env.example

  ✖ ISSUES FOUND:
    • [.env] Key 'REDIS_URL' required by .env.example is missing in .env
    • [.env.example] Potential live Stripe Secret Key found in example file for key 'STRIPE_KEY'!

  ⚠ WARNINGS:
    • [.env.example] Key 'DATABASE_URL' is defined in .env but missing in .env.example

  Audit failed. Please fix the critical issues above.
```

### 2. `generate` (or `gen`)
Automatically parses your `.env` and creates `.env.example` with masked secrets:
```bash
envshield gen
# Overwrite existing example file
envshield gen --force
```

### 3. `diff <file1> <file2>`
Shows side-by-side key differences between two environments:
```bash
envshield diff .env.development .env.production
```

---

## 🤖 GitHub Actions Integration

Prevent broken deployments and secret leaks before merging pull requests. Add this to `.github/workflows/env-check.yml`:

```yaml
name: Env Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run EnvShield
        run: npx envshield check
```

---

## 🧪 Running Tests

EnvShield uses Node's native test runner (`node:test`):

```bash
npm test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
