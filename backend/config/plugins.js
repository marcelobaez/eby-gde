module.exports = ({ env }) => ({
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST", "smtp.example.com"),
        port: env("SMTP_PORT", 25),
        tls: {
          rejectUnauthorized: false,
        },
        pool: true,
        logger: true,
        maxConnections: 10000,
      },
      settings: {
        defaultFrom: env("DEFAULT_EMAIL"),
        defaultReplyTo: env("DEFAULT_EMAIL"),
      },
    },
  },
});
