"use strict";

/**
 * lista controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::lista.lista", ({ strapi }) => ({
  async create(ctx) {
    let newList = ctx.request.body.data;

    newList.usuario = ctx.state.user.id;
    newList.publishedAt = new Date();
    const entry = await strapi.entityService.create("api::lista.lista", {
      data: newList,
    });

    const sanitizedResults = await this.sanitizeOutput(entry, ctx);

    return this.transformResponse(sanitizedResults);
  },

  async find(ctx) {
    const { id } = ctx.state.user;

    const results = await strapi.entityService.findMany("api::lista.lista", {
      filters: {
        usuario: {
          id: {
            $eq: id,
          },
        },
      },
      populate: "*",
    });

    const sanitizedResults = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitizedResults);
  },

  async update(ctx) {
    const { id } = ctx.request.params;

    const list = await strapi.entityService.findOne("api::lista.lista", id);

    if (!list) {
      return ctx.notFound("Recurso no encontrado");
    }

    const entry = await strapi.entityService.update("api::lista.lista", id, {
      data: ctx.request.body.data,
    });
    const sanitizedResults = await this.sanitizeOutput(entry, ctx);

    return this.transformResponse(sanitizedResults);
  },

  async delete(ctx) {
    const { id } = ctx.params;

    const list = await strapi.entityService.findOne("api::lista.lista", id, {
      populate: "*",
    });

    if (!list) {
      return ctx.notFound("Recurso no encontrado");
    }

    // Eliminar los expedientes asociados a la lista
    const expIds = list.expedientes.map((exp) => exp.id);

    if (expIds.length > 0) {
      await strapi.db.query("api::expediente.expediente").deleteMany({
        where: {
          id: {
            $in: [...expIds],
          },
        },
      });
    }

    const entry = await strapi.entityService.delete("api::lista.lista", id);

    const sanitizedResults = await this.sanitizeOutput(entry, ctx);

    return this.transformResponse(sanitizedResults);
  },
}));
