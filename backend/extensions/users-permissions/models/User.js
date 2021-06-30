module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      // Crear y asignar una lista por defecto a un usuario cuando se registra
      await strapi.query('listas').create({titulo: 'Mi lista', usuario: result.id});
    }
  }
};