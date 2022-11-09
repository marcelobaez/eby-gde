module.exports = {
  swcMinify: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/seguimiento",
        permanent: true,
      },
    ];
  },
};
