import { spawn } from 'child_process';
import { join } from 'path';
import { delimiter } from 'path';
import os from 'os';
import config from '../config/index.js';

const DEFAULT_TIMEOUT_MS = 15_000;

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
 * Resolve the openzca CLI entry point (the actual JS script, not the .cmd wrapper).
 * On Windows, the .cmd batch file doesn't pass multi-line arguments correctly.
 * We bypass it by invoking node.exe directly with the openzca entry script.
 */
function getZaloEntry() {
  const npmBin = join(os.homedir(), 'AppData', 'Roaming', 'npm');
  if (process.platform === 'win32') {
    // Bypass .cmd: invoke node directly with the openzca package entry
    return join(npmBin, 'node_modules', 'openzca', 'dist', 'cli.js');
  }
  return join(npmBin, 'zca');
}

/**
 * Build an env object with OPENZCA_HOME expanded so credentials are found.
 */
function zaloEnv() {
  const npmBin = join(os.homedir(), 'AppData', 'Roaming', 'npm');
  return {
    ...process.env,
    OPENZCA_HOME: expandTilde(config.openzcaHome),
    PATH: process.env.PATH + delimiter + npmBin,
  };
}

/**
 * Send a message to a Zalo user via openzca CLI.
 * Automatically times out after DEFAULT_TIMEOUT_MS to avoid blocking the webhook.
 *
 * @param {string} threadId
 * @param {string} message
 * @param {{ isGroup?: boolean, timeoutMs?: number }} options
 */
export function sendMessage(threadId, message, { isGroup = false, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['msg', 'send', threadId, message];
    if (isGroup) args.push('--group');

    // On Windows: spawn node.exe directly to bypass .cmd batch file argument issues.
    // On other platforms: spawn the openzca script directly.
    const entry = getZaloEntry();
    const { command, spawnArgs } = process.platform === 'win32'
      ? { command: process.execPath, spawnArgs: [entry, ...args] }
      : { command: entry, spawnArgs: args };

    console.log(`[ZALO_SENDER] Sending to ${threadId}: ${message.substring(0, 80)}...`);

    const proc = spawn(command, spawnArgs, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: zaloEnv(),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      console.warn(`[ZALO_SENDER] ⏱ Timeout after ${timeoutMs}ms for ${threadId}`);
      reject(new Error(`zca timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        reject(new Error(`zca exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
