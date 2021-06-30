'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    let newExp = ctx.request.body;
    let entity;

    const expediente = await strapi.query('expedientes').findOne({ id_expediente: newExp.id_expediente, lista: newExp.lista});

    if (expediente) {
      return ctx.send({
        message: 'El registro ya existe en su lista!'
      }, 409);
    }

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      data.usuario = ctx.state.user.id;
      entity = await strapi.services.expedientes.create(data, { files });
    } else {
      ctx.request.body.usuario = ctx.state.user.id;
      entity = await strapi.services.expedientes.create(newExp);
    }
    return sanitizeEntity(entity, { model: strapi.models.expedientes });
  },

  async find(ctx) {
    let entities;

    if (ctx.query._q) {
      entities = await strapi.services.expedientes.search({
        ...ctx.query,
        "usuario.id": ctx.state.user.id,
      });
    } else {
      entities = await strapi.services.expedientes.find({
        ...ctx.query,
        "usuario.id": ctx.state.user.id,
      });
    }

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.expedientes })
    );
  },

  /**
   * Obtener expedientes por ID
   *
   * @param {*} ctx the request context
   */
  async findOne(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.expedientes.findOne({
      id,
      "usuario.id": ctx.state.user.id,
    });

    if (!entity) {
      return ctx.unauthorized(`No puedes ver expedientes que no creaste`);
    }

    return sanitizeEntity(entity, { model: strapi.models.expedientes });
  },

  async update(ctx) {
    const { id } = ctx.params;

    let entity;

    const [expediente] = await strapi.services.expedientes.find({
      id: ctx.params.id,
      'usuario.id': ctx.state.user.id,
    });

    if (!expediente) {
      return ctx.unauthorized(`No tienes permisos para editar este expediente`);
    }

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.expedientes.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services.expedientes.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.expedientes });
  },
};
