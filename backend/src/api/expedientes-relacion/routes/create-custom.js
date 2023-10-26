module.exports = {
  routes: [
    {
      // Path defined with a URL parameter
      method: "POST",
      path: "/expedientes-relaciones/createcustom",
      handler: "expedientes-relacion.createCustomChild",
      config: {
        policies: ["is-admin"],
      },
    },
  ],
};
