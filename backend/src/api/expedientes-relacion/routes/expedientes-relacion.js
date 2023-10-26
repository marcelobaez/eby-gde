"use strict";

/**
 * expedientes-relacion router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter(
  "api::expedientes-relacion.expedientes-relacion",
  {
    config: {
      create: {
        policies: ["is-admin"],
      },
      update: {
        policies: ["is-admin"],
      },
      delete: {
        policies: ["is-admin"],
      },
      updateExpRelation: {
        policies: ["is-admin"],
      },
      deleteExpRelation: {
        policies: ["is-admin"],
      },
      createCustom: {
        policies: ["is-admin"],
      },
    },
  }
);
