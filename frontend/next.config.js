module.exports = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.fallback = { fs: false };

    return config;
  },
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
