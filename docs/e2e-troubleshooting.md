# E2E Testing Troubleshooting Guide

This guide helps resolve common issues when running End-to-End tests for the AllStars wedding quiz platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Common Issues](#common-issues)
3. [Hostname Problems](#hostname-problems)
4. [Port Conflicts](#port-conflicts)
5. [Emulator Issues](#emulator-issues)
6. [Test Failures](#test-failures)
7. [Performance Issues](#performance-issues)
8. [CI/CD Issues](#cicd-issues)
9. [Debug Tools](#debug-tools)

---

## Prerequisites

Before troubleshooting, verify you have:

- **Node.js**: v22.x or later
- **pnpm**: v9.x or later
- **work-ubuntu hostname**: Configured in `/etc/hosts`
- **Available ports**: 5173-5176 (apps), 8080 (Firestore), 9099 (Auth)

### Verify Prerequisites

\`\`\`bash
# Check Node version
node --version  # Should show v22.x.x

# Check pnpm version
pnpm --version  # Should show 9.x.x

# Check hostname configuration
cat /etc/hosts | grep work-ubuntu  # Should show: 127.0.0.1 work-ubuntu

# Check port availability
lsof -i :5173 -i :5174 -i :5175 -i :5176 -i :8080 -i :9099
# Should show nothing if ports are free
\`\`\`

---

## Common Issues

### Issue: \`pnpm run e2e\` fails immediately

**Symptoms:**
\`\`\`
Error: spawn ENOENT
\`\`\`

**Cause**: Missing dependencies or Playwright browsers not installed.

**Solution:**
\`\`\`bash
# Reinstall dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
\`\`\`

---

## Hostname Problems

### Issue: \`work-ubuntu\` hostname not resolving

**Symptoms:**
\`\`\`
Error: getaddrinfo ENOTFOUND work-ubuntu
\`\`\`

**Cause**: Hostname not configured in \`/etc/hosts\`.

**Solution:**

\`\`\`bash
# On Linux/macOS
echo "127.0.0.1 work-ubuntu" | sudo tee -a /etc/hosts

# Verify hostname resolves
ping work-ubuntu  # Should ping 127.0.0.1
\`\`\`

---

## Port Conflicts

### Issue: \`EADDRINUSE\` - Port already in use

**Symptoms:**
\`\`\`
Error: listen EADDRINUSE: address already in use :::5173
\`\`\`

**Cause**: Another process is using the required port.

**Solution:**

\`\`\`bash
# Find process using the port
lsof -i :5173

# Kill the process
kill -9 <PID>

# Or kill all Node processes
pkill -f node
\`\`\`

---

## Emulator Issues

### Issue: Firebase Emulators fail to start

**Symptoms:**
\`\`\`
Error: Could not start Firestore Emulator
\`\`\`

**Cause**: Java not installed, port conflict, or corrupted emulator cache.

**Solution:**

\`\`\`bash
# Check Java version (required for Firestore emulator)
java --version  # Should show Java 11 or later

# Clear emulator cache
rm -rf ~/.cache/firebase/emulators

# Try starting manually
firebase emulators:start --only firestore,auth
\`\`\`

---

## Test Failures

### Issue: Test fails with "Timeout exceeded"

**Symptoms:**
\`\`\`
Error: Test timeout of 30000ms exceeded
\`\`\`

**Cause**: Element not found, slow network, or app didn't start.

**Solution:**

\`\`\`bash
# Check if app is accessible
curl http://work-ubuntu:5173  # Should return HTML

# Run test in debug mode
pnpm exec playwright test tests/e2e/scenarios/participant-flow.spec.ts --debug
\`\`\`

---

### Issue: Element not found (\`data-testid\` selector fails)

**Symptoms:**
\`\`\`
Error: Locator('[data-testid="join-button"]') not found
\`\`\`

**Cause**: App UI not implemented yet, or selector changed.

**Solution:**

This is expected for apps that haven't been implemented yet. Tests include TODO comments for unimplemented UI.

---

## Debug Tools

### Playwright Inspector

Run tests in debug mode:

\`\`\`bash
# Debug specific test
pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts --debug

# Debug with headed browser
pnpm exec playwright test --headed
\`\`\`

### HTML Report

Generate and view detailed HTML report:

\`\`\`bash
# Run tests
pnpm run e2e

# Open HTML report
pnpm exec playwright show-report
\`\`\`

---

## Quick Reference Commands

\`\`\`bash
# Run all E2E tests
pnpm run e2e

# Run specific test file
pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts

# List all tests without running
pnpm exec playwright test --list

# Run tests in UI mode (interactive)
pnpm exec playwright test --ui

# Debug specific test
pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts --debug

# View HTML report
pnpm exec playwright show-report

# Clean up
pkill -f node
pkill -f firebase
rm -rf test-results playwright-report
\`\`\`
