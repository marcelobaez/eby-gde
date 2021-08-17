'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      data.usuario = ctx.state.user.id;
      entity = await strapi.services.listas.create(data, { files });
    } else {
      ctx.request.body.usuario = ctx.state.user.id;
      entity = await strapi.services.listas.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.listas });
  },

  async find(ctx) {
    let entities;

    if (ctx.query._q) {
      entities = await strapi.services.listas.search({
        ...ctx.query,
        "usuario.id": ctx.state.user.id,
      });
    } else {
      entities = await strapi.services.listas.find({
        ...ctx.query,
        "usuario.id": ctx.state.user.id,
      });
    }

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.listas })
    );
  },

  /**
   * Obtener listas por ID
   *
   * @param {*} ctx the request context
   */
  async findOne(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.listas.findOne({
      id,
      "usuario.id": ctx.state.user.id,
    });

    if (!entity) {
      return ctx.unauthorized(`No puedes ver listas que no creaste`);
    }

    return sanitizeEntity(entity, { model: strapi.models.listas });
  },

  async delete(ctx) {
    const { id } = ctx.params;

    const [lista] = await strapi.services.listas.find({
      id: ctx.params.id,
      'usuario.id': ctx.state.user.id,
    });

    if (!lista) {
      return ctx.unauthorized(`No tienes permisos para editar esta lista`);
    }

    // No permitir la eliminacion de todas las listas (debe quedar al menos una)
    const listCount = await strapi.query('listas').count();

    if (listCount === 1) return ctx.unauthorized('Debe quedar al menos una lista');

    // Eliminar los expedientes asociados a la lista
    const expIds = lista.expedientes.map(exp => exp.id)

    if (expIds.length > 0) {
      await strapi.query('expedientes').delete({ id_in: [...expIds] });
    }

    const entity = await strapi.services.listas.delete({ id });
    return sanitizeEntity(entity, { model: strapi.models.listas });
  },

  async update(ctx) {
    const { id } = ctx.params;

    let entity;

    const [lista] = await strapi.services.listas.find({
      id: ctx.params.id,
      'usuario.id': ctx.state.user.id,
    });

    if (!lista) {
      return ctx.unauthorized(`No tienes permisos para editar esta lista`);
    }

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.listas.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services.listas.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.listas });
  },
};

