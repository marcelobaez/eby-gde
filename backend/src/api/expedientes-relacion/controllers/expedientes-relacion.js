"use strict";

/**
 * expedientes-relacion controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::expedientes-relacion.expedientes-relacion",
  ({ strapi }) => ({
    // Method 2: Wrapping a core action (leaves core logic in place)
    // async find(ctx) {
    //   // Calling the default core action
    //   const { data, meta } = await super.find(ctx);

    //   return { data, meta };
    // },
    // async find(ctx) {
    //   const { data, meta } = await super.find(ctx);
    //   const query = strapi.db.query(
    //     "api::expedientes-relacion.expedientes-relacion"
    //   );
    //   await Promise.all(
    //     data.map(async (item, index) => {
    //       const foundItem = await query.findOne({
    //         where: {
    //           id: item.id,
    //         },
    //         populate: ["createdBy", "updatedBy", "autor", "children", "parent"],
    //       });

    //       console.log("foundItem", foundItem);

    //       // data[index].attributes.autor = {
    //       //   id: foundItem.autor.id,
    //       //   email: foundItem.autor.email,
    //       // };
    //       if (foundItem.createdBy) {
    //         data[index].attributes.createdBy = {
    //           id: foundItem.createdBy.id,
    //           firstname: foundItem.createdBy.firstname,
    //           lastname: foundItem.createdBy.lastname,
    //         };
    //       }
    //       if (foundItem.updatedBy) {
    //         data[index].attributes.updatedBy = {
    //           id: foundItem.updatedBy.id,
    //           firstname: foundItem.updatedBy.firstname,
    //           lastname: foundItem.updatedBy.lastname,
    //         };
    //       }
    //     })
    //   );
    //   return { data, meta };
    // },
    // Method 2: Wrapping a core action (leaves core logic in place)
    // async findOne(ctx) {
    //   const { id } = ctx.params;
    //   await this.validateQuery(ctx);
    //   const sanitizedQuery = await this.sanitizeQuery(ctx);

    //   const { data, meta } = await strapi
    //     .service(uid)
    //     .findOne(id, sanitizedQuery);

    //   return { data, meta };
    // },
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
        data: { child },
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
            data: { children: [String(newChild.id)] },
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
            data: { children: [String(expHijo[0].id)] },
          }
        );

        // const sanitizedResults = await this.sanitizeOutput(entry, ctx);

        // return this.transformResponse(sanitizedResults);

        return { data, meta };
      }
    },
  })
);
