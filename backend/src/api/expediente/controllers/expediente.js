"use strict";

/**
 * expediente controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::expediente.expediente",
  ({ strapi }) => ({
    async create(ctx) {
      let newExp = ctx.request.body;

      const expedientes = await strapi.entityService.findMany(
        "api::expediente.expediente",
        {
          filters: {
            id_expediente: newExp.id_expediente,
            lista: newExp.lista,
            usuario: {
              id: {
                $eq: ctx.state.user.id,
              },
            },
          },
          limit: 1,
        }
      );

      if (expedientes.length > 0) {
        return ctx.send(
          {
            message: "El registro ya existe en su lista!",
          },
          409
        );
      }

      newExp.usuario = ctx.state.user.id;
      newExp.publishedAt = new Date();
      const entry = await strapi.entityService.create(
        "api::expediente.expediente",
        { data: newExp }
      );

      const sanitizedResults = await this.sanitizeOutput(entry, ctx);

      return this.transformResponse(sanitizedResults);
    },

    async find(ctx) {
      const { id } = ctx.state.user;

      const results = await strapi.entityService.findMany(
        "api::expediente.expediente",
        {
          filters: {
            usuario: {
              id: {
                $eq: id,
              },
            },
          },
          start: 0,
          limit: 100,
        }
      );

      const sanitizedResults = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(sanitizedResults);
    },

    async findOne(ctx) {
      const { id } = ctx.request.params;

      const expedientes = await strapi.entityService.findMany(
        "api::expediente.expediente",
        {
          filters: {
            id: {
              $eq: id,
            },
            usuario: {
              id: {
                $eq: ctx.state.user.id,
              },
            },
          },
          limit: 1,
        }
      );

      if (expedientes.length === 0) {
        return ctx.unauthorized(`No puedes ver expedientes que no creaste`);
      }

      const sanitizedResults = await this.sanitizeOutput(expedientes, ctx);

      return this.transformResponse(sanitizedResults);
    },

    async update(ctx) {
      const { id } = ctx.request.params;

      const expedientes = await strapi.entityService.findMany(
        "api::expediente.expediente",
        {
          filters: {
            id: {
              $eq: id,
            },
            usuario: {
              id: {
                $eq: ctx.state.user.id,
              },
            },
          },
        }
      );

      if (expedientes.length === 0) {
        return ctx.unauthorized(`No puedes ver expedientes que no creaste`);
      }

      const entry = await strapi.entityService.update(
        "api::expediente.expediente",
        id,
        {
          data: ctx.request.body,
        }
      );
      const sanitizedResults = await this.sanitizeOutput(entry, ctx);

      return this.transformResponse(sanitizedResults);
    },
  })
);
