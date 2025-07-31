const user = require("./content-types/User");

module.exports = (plugin) => {
  plugin.contentTypes.user = user;

  // Override the auth controller to include role data in login response
  plugin.controllers.auth = require('./controllers/auth')(plugin);

  return plugin;
};
