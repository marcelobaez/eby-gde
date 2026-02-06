/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // IMPORTANT: Do NOT use output: 'standalone' with oracledb Thick mode
  // The oracledb package requires Oracle Instant Client libraries that must be
  // available at the system level and cannot be traced by Next.js's file tracer.

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
