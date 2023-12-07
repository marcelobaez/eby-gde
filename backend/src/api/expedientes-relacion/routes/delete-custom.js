module.exports = {
  routes: [
    {
      // Path defined with a URL parameter
      method: "PUT",
      path: "/expedientes-relaciones/deleterel/:id",
      handler: "expedientes-relacion.deleteExpRelation",
      config: {
        policies: ["is-admin"],
      },
    },
  ],
};
