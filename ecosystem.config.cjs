module.exports = {
  apps: [
    {
      name: 'watsgo-creators-api',
      script: './api/server.js',
      cwd: '/home/mercurysoftech/web/creators.watsgo.in/public_html',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        API_PORT: 5000,
      },
    },
  ],
};
