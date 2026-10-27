// The host environment may set NODE_ENV=production globally.
// Vite's React refresh transform requires its development runtime.
process.env.NODE_ENV = 'development'
await import('../node_modules/vite/bin/vite.js')
