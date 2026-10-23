// pm2: auth server (localhost:3333) for the OAuth login flow; paths follow this file's location
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'outlook-auth-server',
      script: 'outlook-auth-server.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      log_file: path.join(__dirname, 'logs', 'auth-server.log'),
      error_file: path.join(__dirname, 'logs', 'auth-server-error.log'),
      time: true
    }
  ]
};
