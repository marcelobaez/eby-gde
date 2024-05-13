"use strict";
/**
 * `is-owner` policy.
 */
module.exports = async (policyCtx, config, { strapi }) => {
  const { id: userId } = policyCtx.state.user;

  const { id: listId } = policyCtx.request.params;

  strapi.log.info("In is-owner policy.");

  const [event] = await strapi.entityService.findMany("api::lista.lista", {
    filters: {
      id: listId,
      usuario: userId,
    },
  });
  // existe una lista asociada al usuario
  if (event) {
    return true;
  }

  // no existe ninguna lista para el usuario.
  return false;
};
