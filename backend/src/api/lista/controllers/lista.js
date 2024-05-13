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
      start: 0,
      limit: 100,
      populate: "*",
    });

    const sanitizedResults = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitizedResults);
  },

  // async findOne(ctx) {
  //   const { id } = ctx.request.params;

  //   const lists = await strapi.entityService.findMany("api::lista.lista", {
  //     filters: {
  //       id: {
  //         $eq: id,
  //       },
  //       usuario: {
  //         id: {
  //           $eq: ctx.state.user.id,
  //         },
  //       },
  //     },
  //     limit: 1,
  //     populate: "*",
  //   });

  //   if (lists.length === 0) {
  //     return ctx.unauthorized(`No puedes ver listas que no creaste`);
  //   }

  //   const sanitizedResults = await this.sanitizeOutput(lists, ctx);

  //   return this.transformResponse(sanitizedResults);
  // },

  async update(ctx) {
    const { id } = ctx.request.params;

    const lists = await strapi.entityService.findMany("api::lista.lista", {
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
    });

    if (lists.length === 0) {
      return ctx.unauthorized(`No puedes ver listas que no creaste`);
    }

    const entry = await strapi.entityService.update("api::lista.lista", id, {
      data: ctx.request.body.data,
    });
    const sanitizedResults = await this.sanitizeOutput(entry, ctx);

    return this.transformResponse(sanitizedResults);
  },

  async delete(ctx) {
    const { id } = ctx.params;

    const lists = await strapi.entityService.findMany("api::lista.lista", {
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
      populate: "*",
    });

    // No permitir la eliminacion de todas las listas (debe quedar al menos una)
    if (lists.length === 0) {
      return ctx.unauthorized(`No puedes ver listas que no creaste`);
    }

    const [entries, count] = await strapi.db
      .query("api::lista.lista")
      .findWithCount({
        where: {
          usuario: {
            id: ctx.state.user.id,
          },
        },
      });

    if (count === 1) return ctx.unauthorized("Debe quedar al menos una lista");

    // Eliminar los expedientes asociados a la lista
    const expIds = lists[0].expedientes.map((exp) => exp.id);

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
