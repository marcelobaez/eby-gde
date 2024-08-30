"use strict";

/**
 * lista router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::lista.lista", {
  findOne: {
    middlewares: ["api::lista.lista.is-owner"],
  },
  update: {
    middlewares: ["api::lista.lista.is-owner"],
  },
  delete: {
    middlewares: ["api::lista.lista.is-owner"],
  },
});
