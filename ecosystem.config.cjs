module.exports = {
  apps: [
    {
      name: 'watsgo-creators-api',
      script: './api/server.js',
      cwd: '/home/mercurysoftech/web/creators.watsgo.in/public_html',
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 9876,
        API_PORT: 9876,
      },
    },
  ],
};
