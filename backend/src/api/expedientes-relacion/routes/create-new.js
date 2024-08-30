module.exports = {
  routes: [
    {
      // Path defined with a URL parameter
      method: "POST",
      path: "/expedientes-relaciones/createnew",
      handler: "expedientes-relacion.createNew",
      config: {
        policies: ["is-admin"],
      },
    },
  ],
};
