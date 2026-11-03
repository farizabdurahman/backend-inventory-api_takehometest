const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const openapi = require('../docs/openapi.json')

const { createUserRepository } = require('./repositories/userRepository')
const { createItemRepository } = require('./repositories/itemRepository')
const { createAuthService } = require('./services/authService')
const { createItemService } = require('./services/itemService')
const { createAuthController } = require('./controllers/authController')
const { createItemController } = require('./controllers/itemController')
const { createRoutes } = require('./routes')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')

/** Merakit seluruh lapisan (dependency injection sederhana). Menerima instance db agar mudah dites. */
function createApp(db) {
  const userRepo = createUserRepository(db)
  const itemRepo = createItemRepository(db)

  const authController = createAuthController(createAuthService(userRepo))
  const itemController = createItemController(createItemService(itemRepo))

  const app = express()
  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json({ limit: '100kb' }))

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi))
  app.use('/api', createRoutes({ authController, itemController }))

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

module.exports = { createApp }
