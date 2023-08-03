module.exports = {
  afterCreate: async (event) => {
    const { result } = event;
    // Crear y asignar una lista por defecto a un usuario cuando se registra
    await strapi.entityService.create("api::lista.lista", {
      data: {
        titulo: "Mi lista",
        usuario: result.id,
        publishedAt: new Date(),
      },
    });
  },
};
