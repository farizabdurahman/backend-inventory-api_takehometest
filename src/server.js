const config = require('./config')
const { createDatabase } = require('./db/database')
const { createApp } = require('./app')

const db = createDatabase()
const app = createApp(db)

const server = app.listen(config.port, () => {
  console.log(`Inventory API berjalan di http://localhost:${config.port}`)
  console.log(`Dokumentasi Swagger:   http://localhost:${config.port}/docs`)
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
