module.exports = {
  apps: [
    {
      name: 'cs-admin',
      cwd: './apps/admin',
      script: 'node_modules/.bin/next',
      args: 'start',
      port: process.env.ADMIN_PORT || 3002,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.ADMIN_PORT || 3002,
        JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
        DATABASE_PATH: process.env.DATABASE_PATH || './data/cs-training.db',
      }
    },
    {
      name: 'cs-client',
      cwd: './apps/client',
      script: 'node_modules/.bin/next',
      args: 'start',
      port: process.env.CLIENT_PORT || 3000,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.CLIENT_PORT || 3000,
        JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
        DATABASE_PATH: process.env.DATABASE_PATH || './data/cs-training.db',
      }
    }
  ]
};
