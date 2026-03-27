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

/**
 * Expand ~ to the user's home directory (handles ~ in paths on Windows).
 */
function expandTilde(path) {
  if (path.startsWith('~/') || path === '~') {
    return join(os.homedir(), path.slice(1));
  }
  return path;
}

/**
 * Resolve the zca binary path.
 * On Windows: bypass .cmd wrapper by invoking node.exe directly with the openzca entry.
 * On Linux/Mac: use the npm bin symlink.
 */
function getZaloBin() {
  const npmBin = join(os.homedir(), 'AppData', 'Roaming', 'npm');
  if (process.platform === 'win32') {
    // Bypass .cmd: invoke node directly with the openzca package entry
    return join(npmBin, 'node_modules', 'openzca', 'dist', 'cli.js');
  }
  return join(npmBin, 'zca');
}

/**
 * Spawn arguments for the platform.
 * On Windows: invoke node.exe directly with the openzca entry script.
 * On Linux/Mac: invoke the npm bin symlink directly.
 */
function buildSpawnArgs(args) {
  const bin = getZaloBin();
  if (process.platform === 'win32') {
    return { command: process.execPath, args: [bin, ...args] };
  }
  return { command: bin, args };
}

/**
 * Spawn a new openzca listen process.
 */
function spawnListener() {
  const listenArgs = ['listen', '--webhook', WEBHOOK_URL, '--keep-alive'];
  const { command, args } = buildSpawnArgs(listenArgs);

  const proc = spawn(command, args, {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENZCA_HOME: expandTilde(config.openzcaHome),
    },
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
  console.log(`[OPENZCA_RUNNER] ✅ openzca started (${command} ${args.join(' ')}) [restart #${restartCount}]`);
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
