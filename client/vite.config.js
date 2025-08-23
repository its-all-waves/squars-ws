export default ({ mode }) => ({
  build: {
    minify: mode !== 'development',
    sourcemap: true,
  }
})
