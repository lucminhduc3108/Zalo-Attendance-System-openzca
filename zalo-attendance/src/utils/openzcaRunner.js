/**
 * openzcaRunner — manages the `openzca listen` subprocess with auto-restart.
 */
import { spawn } from 'child_process';
import { join } from 'path';
import os from 'os';
import config from '../config/index.js';

const WEBHOOK_URL = `http://localhost:${config.port}/hook`;
const RESTART_DELAY_MS = 5000;
const MAX_RESTARTS = 10;

let listenerProc = null;
let restartCount = 0;
let restarting = false;

// ── Shared helpers (used by both listener and CLI runner) ──────────────────

/** Platform-agnostic npm global bin directory. */
const NPM_BIN = process.platform === 'win32'
  ? join(os.homedir(), 'AppData', 'Roaming', 'npm')
  : join(os.homedir(), '.npm-global', 'bin');

/**
 * Expand ~ to the user's home directory.
 */
function expandPath(path) {
  if (!path) return join(os.homedir(), '.openzca');
  if (path.startsWith('~/') || path === '~') return join(os.homedir(), path.slice(1));
  return path;
}

/**
 * Resolve the openzca entry point for the current platform.
 * Windows: bypass .cmd wrapper via node.exe → cli.js
 * Linux/Mac: invoke npm bin symlink directly.
 */
function getZaloEntry() {
  if (process.platform === 'win32') {
    return join(NPM_BIN, 'node_modules', 'openzca', 'dist', 'cli.js');
  }
  return join(NPM_BIN, 'zca');
}

/**
 * Build the env object for openzca processes (credentials + PATH).
 */
function zaloEnv() {
  return {
    ...process.env,
    OPENZCA_HOME: expandPath(config.openzcaHome),
    PATH: process.env.PATH + (process.platform === 'win32' ? ';' : ':') + NPM_BIN,
  };
}

/**
 * Spawn a new openzca listen process.
 */
function spawnListener() {
  const listenArgs = ['listen', '--webhook', WEBHOOK_URL, '--keep-alive'];
  const entry = getZaloEntry();
  const { command, args } = process.platform === 'win32'
    ? { command: process.execPath, args: [entry, ...listenArgs] }
    : { command: entry, args: listenArgs };

  const proc = spawn(command, args, {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: zaloEnv(),
  });

  proc.stdout?.on('data', (data) => {
    process.stdout.write(`[openzca|out] ${data}`);
  });

  proc.stderr?.on('data', (data) => {
    process.stderr.write(`[openzca|err] ${data}`);
  });

  proc.on('close', (code, signal) => {
    listenerProc = null;
    console.log(`[OPENZCA_RUNNER] ⚠️  openzca exited (code=${code} signal=${signal})`);

    if (!restarting) {
      scheduleRestart();
    }
  });

  proc.on('error', (err) => {
    listenerProc = null;
    console.error(`[OPENZCA_RUNNER] ❌ Spawn error: ${err.message}`);
    if (!restarting) {
      scheduleRestart();
    }
  });

  listenerProc = proc;
  console.log(`[OPENZCA_RUNNER] ✅ openzca started (${command} ${listenArgs.join(' ')}) [restart #${restartCount}]`);
}

/**
 * Schedule a restart after RESTART_DELAY_MS, unless we've hit MAX_RESTARTS.
 */
function scheduleRestart() {
  if (restarting) return;
  restarting = true;

  if (restartCount >= MAX_RESTARTS) {
    console.error(
      `[OPENZCA_RUNNER] ❌ Max restarts (${MAX_RESTARTS}) reached. Giving up — manual intervention required.`
    );
    return;
  }

  restartCount++;
  console.log(`[OPENZCA_RUNNER] 🔄 Restarting in ${RESTART_DELAY_MS / 1000}s... (attempt ${restartCount}/${MAX_RESTARTS})`);

  setTimeout(() => {
    restarting = false;
    spawnListener();
  }, RESTART_DELAY_MS);
}

/**
 * Start the openzca listen subprocess.
 * Idempotent — safe to call multiple times.
 */
export function startListener() {
  if (listenerProc) {
    console.log('[OPENZCA_RUNNER] Already running, skipping start.');
    return;
  }
  console.log(`[OPENZCA_RUNNER] Starting openzca listen → ${WEBHOOK_URL}`);
  spawnListener();
}

/**
 * Gracefully stop the openzca listen subprocess.
 */
export function stopListener() {
  if (!listenerProc) {
    console.log('[OPENZCA_RUNNER] No listener running.');
    return;
  }
  restarting = false; // prevent auto-restart
  listenerProc.kill('SIGTERM');
  listenerProc = null;
  console.log('[OPENZCA_RUNNER] Listener stopped.');
}

/**
 * Run an openzca CLI command and return its stdout.
 * @param {string[]} args - openzca subcommand args, e.g. ['msg', 'send', threadId, message]
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<string>} stdout
 */
export async function runOpenzca(args, { timeoutMs = 15_000 } = {}) {
  const entry = getZaloEntry();
  const { command, args: spawnArgs } = process.platform === 'win32'
    ? { command: process.execPath, args: [entry, ...args] }
    : { command: entry, args };

  return new Promise((resolve, reject) => {
    const proc = spawn(command, spawnArgs, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: zaloEnv(),
    });

    let stdout = '', stderr = '';
    proc.stdout?.on('data', d => { stdout += d.toString(); });
    proc.stderr?.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`openzca timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `openzca exited code ${code}`));
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}
