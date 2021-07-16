module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '31cdd2534d8d369d36c418a5b36c012b'),
    },
  },
  url: env('NEXT_PUBLIC_API_URL', 'http://localhost:1337')
});
