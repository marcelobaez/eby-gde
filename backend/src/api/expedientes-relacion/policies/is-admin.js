const { errors } = require("@strapi/utils");
const { PolicyError } = errors;

module.exports = async (policyContext, config, { strapi }) => {
  // check if user is admin
  if (
    policyContext.state.user.role.name.toLowerCase() === "admin" ||
    policyContext.state.user.role.name.toLowerCase() === "operador-obya"
  ) {
    // Go to controller's action.
    return true;
  }
  // if not admin block request
  const user = policyContext.state.user.username;
  throw new PolicyError(
    `Hola ${user}, ud no esta habilitado para modificar las asociaciones`,
    {
      policy: "admin-policy",
    }
  );
};
