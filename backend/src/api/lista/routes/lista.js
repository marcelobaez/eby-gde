"use strict";

/**
 * lista router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::lista.lista", {
  findOne: {
    policies: ["is-owner"],
  },
  update: {
    policies: ["is-owner"],
  },
  delete: {
    policies: ["is-owner"],
  },
});
