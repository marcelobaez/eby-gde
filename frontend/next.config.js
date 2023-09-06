const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.fallback = { fs: false };

    // config.plugins.push(
    //   new CopyPlugin({
    //     patterns: [
    //       {
    //         // Copy the binary Oracle DB driver to dist.
    //         from: path.resolve("node_modules/oracledb/build/Release"),
    //         to: "app/node_modules/oracledb",
    //       },
    //     ],
    //   })
    // );

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
