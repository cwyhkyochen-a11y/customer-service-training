module.exports = {
  apps: [
    {
      name: 'cs-admin',
      cwd: '/home/admin/customer-service-training/apps/admin',
      script: '/home/admin/customer-service-training/node_modules/.pnpm/next@16.1.6_@babel+core@7.29.0_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: 'cs-training-secret-key-2024',
        DB_PATH: '/home/admin/customer-service-training/data/cs-training.db',
      },
    },
    {
      name: 'cs-client',
      cwd: '/home/admin/customer-service-training/apps/client',
      script: '/home/admin/customer-service-training/node_modules/.pnpm/next@16.1.6_@babel+core@7.29.0_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
