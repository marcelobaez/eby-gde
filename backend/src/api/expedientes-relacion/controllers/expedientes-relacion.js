"use strict";

/**
 * expedientes-relacion controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::expedientes-relacion.expedientes-relacion",
  ({ strapi }) => ({
    async deleteExpRelation(ctx) {
      const { id } = ctx.request.params;

      const { data, meta } = await strapi.entityService.update(
        "api::expedientes-relacion.expedientes-relacion",
        id,
        {
          data: { parent: [] },
        }
      );

      return { data, meta };
    },
    async createNew(ctx) {
      const { parent, child } = ctx.request.body.data;

      // buscar si existe un expediente hijo con el mismo ID
      const expHijo = await strapi.entityService.findMany(
        "api::expedientes-relacion.expedientes-relacion",
        {
          filters: {
            expCode: {
              $eq: child.expCode,
            },
          },
          limit: 1,
          populate: ["children"],
        }
      );

      // buscar si existe un expediente padre con el mismo ID
      const expPadre = await strapi.entityService.findMany(
        "api::expedientes-relacion.expedientes-relacion",
        {
          filters: {
            expCode: {
              $eq: parent.expCode,
            },
          },
          limit: 1,
          populate: ["children"],
        }
      );

      if (expHijo.length === 0 && expPadre.length === 0) {
        console.log("no existe hijo, no existe padre");
        // si no existe un expediente hijo, crear el hijo y el padre y asociarlos
        const newChild = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...child,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        const newParent = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...parent,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        // asociar el hijo al padre
        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          newParent.id,
          {
            data: {
              children: {
                connect: [newChild.id],
              },
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else if (expHijo.length === 0 && expPadre.length > 0) {
        console.log("no existe hijo, existe padre");
        // si no existe un expediente hijo, crear el hijo y asociarlo al padre
        const newChild = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...child,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          expPadre[0].id,
          {
            data: {
              children: {
                connect: [newChild.id],
              },
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else if (expHijo.length > 0 && expPadre.length === 0) {
        console.log("existe hijo, no existe padre");

        // si no existe un expediente padre, crear el padre y asociar el hijo
        const newParent = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...parent,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          newParent.id,
          {
            data: {
              children: {
                connect: [expHijo[0].id],
              },
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else {
        console.log("existe hijo, existe padre");
        // si ambos expedientes existen, asociarlos
        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          expPadre[0].id,
          {
            data: {
              children: {
                connect: [expHijo[0].id],
              },
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      }
    },
  })
);
