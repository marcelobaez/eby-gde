"use strict";

/**
 * expediente controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::expediente.expediente",
  ({ strapi }) => ({
    async create(ctx) {
      let newExp = ctx.request.body.data;

      const expedientes = await strapi.entityService.findMany(
        "api::expediente.expediente",
        {
          filters: {
            id_expediente: {
              $eq: newExp.id_expediente,
            },
            lista: {
              id: { $eq: newExp.lista },
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
          limit: 10000,
        }
      );

      const sanitizedResults = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(sanitizedResults);
    },

    async findOne(ctx) {
      const { id } = ctx.request.params;

      const expediente = await strapi.entityService.findOne(
        "api::expediente.expediente",
        id
      );

      if (!expediente) {
        return ctx.notFound("Recurso no encontrado");
      }

      const sanitizedResults = await this.sanitizeOutput(expediente, ctx);

      return this.transformResponse(sanitizedResults);
    },

    async update(ctx) {
      const { id } = ctx.request.params;

      const expediente = await strapi.entityService.findOne(
        "api::expediente.expediente",
        id
      );

      if (!expediente) {
        return ctx.notFound("Recurso no encontrado");
      }

      const entry = await strapi.entityService.update(
        "api::expediente.expediente",
        id,
        {
          data: ctx.request.body.data,
        }
      );
      const sanitizedResults = await this.sanitizeOutput(entry, ctx);

      return this.transformResponse(sanitizedResults);
    },
  })
);
