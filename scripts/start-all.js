const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend-react');
const BACKEND_PORT = Number(process.env.PORT || 5500);
const BACKEND_HEALTH_URL = `http://localhost:${BACKEND_PORT}/api/health`;
const BACKEND_START_TIMEOUT = 30000;
const HEALTH_CHECK_INTERVAL = 500;

function getCommandArgs(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      finalArgs: ['/c', 'npm', ...args]
    };
  }

  return {
    command: 'npm',
    finalArgs: args
  };
}

function run(name, args, cwd, env = {}) {
  const { command, finalArgs } = getCommandArgs(args);
  const child = spawn(command, finalArgs, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  child.on('error', (err) => {
    console.error(`[${name}] failed to start:`, err.message);
  });

  return child;
}

function waitForBackendHealth(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkHealth = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Backend did not become healthy after ${timeoutMs / 1000}s`));
        return;
      }

      const req = http.get(url, { timeout: 2000 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          res.resume();
          setTimeout(checkHealth, HEALTH_CHECK_INTERVAL);
        }
      });

      req.on('error', () => {
        setTimeout(checkHealth, HEALTH_CHECK_INTERVAL);
      });

      req.on('timeout', () => {
        req.destroy();
        setTimeout(checkHealth, HEALTH_CHECK_INTERVAL);
      });
    };

    checkHealth();
  });
}

let backend;
let frontend;
let backendExited = false;

function shutdown() {
  if (frontend && !frontend.killed) frontend.kill();
  if (backend && !backend.killed) backend.kill();
  process.exit(0);
}

async function startServices() {
  console.log('Starting HireSmart...');
  console.log(`Backend: http://localhost:${BACKEND_PORT}/api`);
  console.log('Frontend: http://localhost:3000');

  backend = run('backend', ['start'], backendDir, { PORT: String(BACKEND_PORT) });

  backend.on('exit', (code) => {
    backendExited = true;
    if (code !== 0) {
      console.error(`[backend] exited with code ${code}`);
    }
  });

  try {
    console.log(`Waiting for backend to become healthy at ${BACKEND_HEALTH_URL}...`);
    await waitForBackendHealth(BACKEND_HEALTH_URL, BACKEND_START_TIMEOUT);

    if (backendExited) {
      throw new Error('Backend process exited before becoming healthy.');
    }

    console.log('Backend is healthy. Starting frontend...');
    frontend = run('frontend', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '3000', '--strictPort'], frontendDir);

  } catch (err) {
    console.error('Startup failed:', err.message);
    shutdown();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServices();
