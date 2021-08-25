module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/seguimiento',
        permanent: true,
      },
    ]
  },
}
