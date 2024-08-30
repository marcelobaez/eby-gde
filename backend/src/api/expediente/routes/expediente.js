"use strict";

/**
 * expediente router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::expediente.expediente", {
  findOne: {
    middlewares: ["api::expediente.expediente.is-owner"],
  },
  update: {
    middlewares: ["api::expediente.expediente.is-owner"],
  },
  delete: {
    middlewares: ["api::expediente.expediente.is-owner"],
  },
});
