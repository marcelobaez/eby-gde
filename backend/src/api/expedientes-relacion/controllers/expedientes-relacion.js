"use strict";

/**
 * expedientes-relacion controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::expedientes-relacion.expedientes-relacion",
  ({ strapi }) => ({
    async createCustomChild(ctx) {
      let newExp = ctx.request.body.data;

      // primero crear el hijo
      const newChild = await strapi.entityService.create(
        "api::expedientes-relacion.expedientes-relacion",
        {
          data: {
            ...newExp.child,
            publishedAt: new Date(),
            autor: ctx.state.user.id,
          },
        }
      );

      // buscar si existe un expediente hijo con el mismo ID
      const expPadre = await strapi.entityService.findMany(
        "api::expedientes-relacion.expedientes-relacion",
        {
          filters: {
            expId: {
              $eq: newExp.parent.expId,
            },
          },
          limit: 1,
        }
      );

      if (expPadre.length === 0) {
        // si no existe un expediente padre, crear el padre y asociar el hijo existente
        const newParent = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...newExp.parent,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          newChild.id,
          {
            data: {
              parent: String(newParent.id),
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else {
        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          newChild.id,
          {
            data: {
              parent: String(expPadre[0].id),
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      }
    },
    async create(ctx) {
      let newExp = ctx.request.body.data;

      // buscar si existe un expediente hijo con el mismo ID
      const expHijo = await strapi.entityService.findMany(
        "api::expedientes-relacion.expedientes-relacion",
        {
          filters: {
            expId: {
              $eq: newExp.child.expId,
            },
          },
          limit: 1,
        }
      );

      if (expHijo.length === 0) {
        // si no existe un expediente hijo, crear el hijo y el padre y asociarlos
        const newChild = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...newExp.child,
              publishedAt: new Date(),
              autor: ctx.state.user.id,
            },
          }
        );

        const newParent = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...newExp.parent,
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
              children: [String(newChild.id)],
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else {
        // si existe un expediente hijo, crear el padre y asociar el hijo
        const newParent = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: {
              ...newExp.parent,
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
              children: [String(expHijo[0].id)],
            },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      }
    },
    async updateExpRelation(ctx) {
      const { id } = ctx.request.params;
      const {
        data: { child, existingChild },
      } = ctx.request.body;

      // buscar si existe un expediente hijo con el mismo ID
      const expHijo = await strapi.entityService.findMany(
        "api::expedientes-relacion.expedientes-relacion",
        {
          filters: {
            expId: {
              $eq: child.expId,
            },
          },
          limit: 1,
        }
      );

      if (expHijo.length === 0) {
        // si no existe un expediente hijo, crear el hijo y el padre y asociarlos
        const newChild = await strapi.entityService.create(
          "api::expedientes-relacion.expedientes-relacion",
          {
            data: { ...child, publishedAt: new Date() },
          }
        );

        const entry = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          id,
          {
            data: { children: [...existingChild, String(newChild.id)] },
          }
        );

        const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        return this.transformResponse(sanitizedResults);
      } else {
        // si existe un expediente hijo, crear el padre y asociar el hijo
        const { data, meta } = await strapi.entityService.update(
          "api::expedientes-relacion.expedientes-relacion",
          id,
          {
            data: { children: [...existingChild, String(expHijo[0].id)] },
          }
        );

        return { data, meta };
      }
    },
    async updateCustomRelation(ctx) {
      const { id } = ctx.request.params;
      const {
        data: { child, existingChild },
      } = ctx.request.body;

      const newChild = await strapi.entityService.create(
        "api::expedientes-relacion.expedientes-relacion",
        {
          data: { ...child, publishedAt: new Date() },
        }
      );

      const entry = await strapi.entityService.update(
        "api::expedientes-relacion.expedientes-relacion",
        id,
        {
          data: { children: [...existingChild, String(newChild.id)] },
        }
      );

      const sanitizedResults = await this.sanitizeOutput(entry, ctx);

      return this.transformResponse(sanitizedResults);
    },
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
  })
);
