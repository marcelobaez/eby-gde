const cronTasks = require("./cron-tasks");

module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("NEXT_PUBLIC_API_URL", "http://localhost:1337"),
  app: {
    keys: env.array("APP_KEYS"),
  },
  cron: {
    enabled: env.bool("CRON_ENABLED", false),
    tasks: cronTasks,
  },
});
