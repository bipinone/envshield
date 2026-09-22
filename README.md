<div align="center">

# EnvShield

**A lightweight, zero-dependency command-line utility to audit environment files, prevent credential leaks, and synchronize `.env.example` templates.**

<br />

[![CI](https://img.shields.io/github/actions/workflow/status/bipinone/envshield/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/bipinone/envshield/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-black?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=flat-square)](#)

<br />

[![Telegram Channel](https://img.shields.io/badge/Telegram-Channel-24A1DE?style=flat-square&logo=telegram&logoColor=white)](https://t.me/BipinOne)
[![Telegram Group](https://img.shields.io/badge/Telegram-Community-24A1DE?style=flat-square&logo=telegram&logoColor=white)](https://t.me/BipinOneChat)
[![Instagram](https://img.shields.io/badge/Instagram-@bipinone-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://www.instagram.com/bipinone)

</div>

---

### Overview

Managing environment variables across development, staging, and production often leads to:
- **Desynchronized files**: Missing keys between `.env` and `.env.example` leading to runtime crashes.
- **Accidental leaks**: Uncommitted `.gitignore` rules causing `.env` credentials to be published publicly.
- **Exposed production tokens**: Real API keys accidentally left in example or template files.

**EnvShield** provides an automated, dependency-free solution to inspect, sanitize, and compare environment files directly within your terminal or CI pipeline.

---

### Core Features

- **Automated Sync Audit**: Validates that all keys in `.env` exist in `.env.example` (and vice versa).
- **Git Protection Check**: Ensures `.env` and local environment files are ignored by `.gitignore`.
- **Secret Detection**: Detects live credentials (OpenAI, AWS, Stripe, Slack, private keys) before they reach version control.
- **Template Generator**: Generates safe `.env.example` files from live `.env` configurations with sanitized placeholders.
- **Diff Utility**: Compares variable names and values between two environment files side by side.
- **Zero External Dependencies**: Implemented strictly with Node.js built-in modules for maximum execution speed and zero security footprint.
- **Pipeline Compatible**: Emits standard non-zero exit codes for pre-commit hooks and GitHub Actions.

---

### Quick Start

Run directly without installation via `npx`:

```bash
# Audit environment configuration in current directory
npx envshield check

# Automatically generate a sanitized .env.example
npx envshield gen

# Compare differences between two env files
npx envshield diff .env.local .env.production
```

Or install globally:

```bash
npm install -g envshield
envshield --help
```

---

### Command Reference

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `check` | `envshield check [-d <path>]` | Audits `.env` files, detects secret leaks, and checks synchronization. *(Default)* |
| `gen` | `envshield gen [--force]` | Generates `.env.example` from existing `.env` with masked values. |
| `diff` | `envshield diff <file1> <file2>` | Compares keys and values across two environment files. |
| `help` | `envshield --help` | Displays usage instructions and available parameters. |

#### Flags

- `-d, --dir <path>`: Specifies custom project directory (default: current working directory).
- `--fix`: Automatically repairs missing `.env` exclusion rules in `.gitignore`.
- `--json`: Formats audit output into clean JSON for machine parsing and CI/CD pipelines.
- `--strict`: Treats warnings as blocking errors (exits with code 1).
- `-f, --force`: Overwrites existing `.env.example` during generation.
- `-v, --version`: Displays the installed version.
- `-h, --help`: Displays help documentation.

---

### Platform Support

EnvShield is natively tested and verified across all major operating systems:

| Operating System | Support | Architecture |
| :--- | :--- | :--- |
| **Linux** (Ubuntu, Debian, Fedora, Arch) | Supported | x64, arm64 |
| **macOS** (Apple Silicon M1/M2/M3 & Intel) | Supported | arm64, x64 |
| **Windows** (Command Prompt, PowerShell, Windows Terminal) | Supported | x64 |

---

### CLI Terminal Output

```text
  EnvShield v1.0.0
  Smart environment file auditor, secret scanner & sync manager

  Scanning project at: /home/workspace/my-app

  Files detected: .env, .env.example

  ISSUES FOUND:
  • [.env] Key 'DATABASE_URL' required by .env.example is missing in .env
  • [.env.example] Potential live Stripe API Key found in example file for key 'STRIPE_SECRET'!

  WARNINGS:
  • [.env.example] Key 'CACHE_TTL' is defined in .env but missing in .env.example

  Audit failed. Please fix the critical issues above.
```

---

### CI/CD Integration (GitHub Actions)

Add this workflow to `.github/workflows/env-check.yml` to automatically prevent broken configurations from being merged:

```yaml
name: Environment Audit

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run EnvShield Audit
        run: npx envshield check
```

---

### Development & Testing

EnvShield uses Node.js native test runner (`node:test`):

```bash
# Clone the repository
git clone git@github.com:bipinone/envshield.git
cd envshield

# Run test suite
npm test
```

---

### Connect & Community

For updates, questions, and discussions, feel free to join the community channels:

- **Telegram Updates**: [@BipinOne](https://t.me/BipinOne)
- **Telegram Discussion**: [@BipinOneChat](https://t.me/BipinOneChat)
- **Instagram**: [@bipinone](https://www.instagram.com/bipinone)

---

### License

Distributed under the [MIT License](LICENSE).
