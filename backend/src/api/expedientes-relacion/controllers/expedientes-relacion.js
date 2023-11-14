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
      const { parent, child } = ctx.request.body.data;

      // si padre e hijo son expedientes
      if (parent.isExp && child.isExp) {
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
            populate: ["children"],
          }
        );

        // buscar si existe un expediente padre con el mismo ID
        const expPadre = await strapi.entityService.findMany(
          "api::expedientes-relacion.expedientes-relacion",
          {
            filters: {
              expId: {
                $eq: parent.expId,
              },
            },
            limit: 1,
            populate: ["children"],
          }
        );

        // console.log("expPadre", expPadre);
        // console.log("expHijo", expHijo);
        // console.log("parent", parent);
        // console.log("children", child);

        // si ambos expedientes no existen, crearlos y asociarlos
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
                children: [String(newChild.id)],
                autor: ctx.state.user.id,
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
                children: [
                  ...expPadre[0].children.map((child) => child.id),
                  String(newChild.id),
                ],
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
                children: [String(expHijo[0].id)],
                autor: ctx.state.user.id,
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
                children: [
                  ...expPadre[0].children.map((child) => child.id),
                  String(expHijo[0].id),
                ],
                autor: ctx.state.user.id,
              },
            }
          );

          const sanitizedResults = await this.sanitizeOutput(entry, ctx);

          return this.transformResponse(sanitizedResults);
        }
      } else if (parent.isExp && !child.isExp) {
        // buscar si existe un expediente padre con el mismo ID
        const expPadre = await strapi.entityService.findMany(
          "api::expedientes-relacion.expedientes-relacion",
          {
            filters: {
              expId: {
                $eq: parent.expId,
              },
            },
            limit: 1,
            populate: ["children"],
          }
        );

        // si el padre es expediente y el hijo no, crear el hijo y asociarlo al padre
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

        if (expPadre.length === 0) {
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
                children: [String(newChild.id)],
                autor: ctx.state.user.id,
              },
            }
          );

          const sanitizedResults = await this.sanitizeOutput(entry, ctx);

          return this.transformResponse(sanitizedResults);
        } else {
          const entry = await strapi.entityService.update(
            "api::expedientes-relacion.expedientes-relacion",
            expPadre[0].id,
            {
              data: {
                children: [
                  ...expPadre[0].children.map((child) => child.id),
                  String(newChild.id),
                ],
                autor: ctx.state.user.id,
              },
            }
          );

          const sanitizedResults = await this.sanitizeOutput(entry, ctx);

          return this.transformResponse(sanitizedResults);
        }
      } else if (!parent.isExp && child.isExp) {
        console.log("padre no es expediente, hijo si");
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
            populate: ["children"],
          }
        );

        // si el padre no es expediente y el hijo si, crear el padre y asociar el hijo
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

        if (expHijo.length === 0) {
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
            newParent.id,
            {
              data: {
                children: [String(newChild.id)],
                autor: ctx.state.user.id,
              },
            }
          );

          const sanitizedResults = await this.sanitizeOutput(entry, ctx);

          return this.transformResponse(sanitizedResults);
        } else {
          const entry = await strapi.entityService.update(
            "api::expedientes-relacion.expedientes-relacion",
            newParent.id,
            {
              data: {
                children: [
                  ...expHijo[0].children.map((child) => child.id),
                  String(newParent.id),
                ],
                autor: ctx.state.user.id,
              },
            }
          );

          const sanitizedResults = await this.sanitizeOutput(entry, ctx);

          return this.transformResponse(sanitizedResults);
        }
      } else {
        console.log("padre no es expediente, hijo no es expediente");
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
