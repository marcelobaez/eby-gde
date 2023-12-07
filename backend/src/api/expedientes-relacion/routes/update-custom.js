module.exports = {
  routes: [
    {
      // Path defined with a URL parameter
      method: "PUT",
      path: "/expedientes-relaciones/updaterelcustom/:id",
      handler: "expedientes-relacion.updateCustomRelation",
      config: {
        policies: ["is-admin"],
      },
    },
  ],
};
