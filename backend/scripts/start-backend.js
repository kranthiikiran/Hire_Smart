require('dotenv').config();

const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const port = Number(process.env.PORT || 5500);

function canBindPort(portToCheck) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      resolve(false);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    // Do not force host so this mirrors how Express binds and catches IPv6 (::) conflicts.
    tester.listen(portToCheck);
  });
}

function checkHealth(portToCheck) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: 'localhost',
        port: portToCheck,
        path: '/api/health',
        timeout: 1500
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => resolve(false));
  });
}

(async () => {
  const available = await canBindPort(port);

  if (!available) {
    const healthyBackend = await checkHealth(port);

    if (healthyBackend) {
      console.log(`Backend is already running at http://localhost:${port}`);
      process.exit(0);
      return;
    }

    console.error(`Port ${port} is already in use by another process.`);
    console.error('Stop the conflicting process or free the port, then run npm start again.');
    process.exit(1);
    return;
  }

  const serverPath = path.join(__dirname, '..', 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error('Failed to start backend:', err.message);
    process.exit(1);
  });

  const stopChild = () => {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  };

  process.on('SIGINT', stopChild);
  process.on('SIGTERM', stopChild);
})();
