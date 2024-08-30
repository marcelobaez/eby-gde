"use strict";

/**
 * `isOwner` middleware
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const user = ctx.state.user;
    const entryId = ctx.params.id ? ctx.params.id : undefined;
    let entry = {};

    /**
     * Gets all information about a given entry,
     * populating every relations to ensure
     * the response includes author-related information
     */
    if (entryId) {
      entry = await strapi.entityService.findOne("api::lista.lista", entryId, {
        populate: "*",
      });
    }

    /**
     * Compares user id and entry author id
     * to decide whether the request can be fulfilled
     * by going forward in the Strapi backend server
     */
    if (user.id !== entry.usuario.id) {
      return ctx.unauthorized("No puede acceder a este recurso.");
    } else {
      return next();
    }
  };
};
