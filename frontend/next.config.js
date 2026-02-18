/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Standalone output for optimized Docker builds
  output: 'standalone',

  // Exclude oracledb from bundling (it has native bindings)
  serverExternalPackages: ['oracledb'],

  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },

  transpilePackages: [
    "antd",
    "@ant-design/plots",
    "@ant-design/icons",
    "@ant-design/icons-svg",
    "rc-pagination",
    "rc-picker",
    "rc-util",
    "rc-tree",
    "rc-tooltip",
    "rc-table",
    "rc-input",
  ],
};

module.exports = nextConfig;
