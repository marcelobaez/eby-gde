module.exports = {
  routes: [
    {
      // Path defined with a URL parameter
      method: "PUT",
      path: "/expedientes-relaciones/updaterel/:id",
      handler: "expedientes-relacion.updateExpRelation",
      config: {
        policies: ["is-admin"],
      },
    },
  ],
};
