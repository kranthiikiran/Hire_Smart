const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend-react');

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

console.log('Starting HireSmart...');
console.log('Frontend: http://localhost:3000');
console.log('Backend : http://localhost:5500/api');

const backend = run('backend', ['start'], backendDir, { PORT: '5500' });
const frontend = run('frontend', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '3000', '--strictPort'], frontendDir);

function shutdown() {
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
