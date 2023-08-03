module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapiv4'),
      user: env('DATABASE_USERNAME', 'strapiv4user'),
      password: env('DATABASE_PASSWORD', 'strapipwd'),
      schema: env('DATABASE_SCHEMA', 'public'), // Not required
      ssl: env.bool('DATABASE_SSL', false),
    },
    debug: false,
  },
});