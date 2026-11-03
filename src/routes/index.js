const { Router } = require('express')
const { validate } = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')
const s = require('../validators/schemas')

// Router: memetakan URL + method ke controller, dan memasang middleware yang diperlukan.
function createRoutes({ authController, itemController }) {
  const router = Router()

  router.get('/health', (_req, res) => res.json({ status: 'ok' }))

  // --- Auth (publik) ---
  router.post('/auth/register', validate({ body: s.register }), authController.register)
  router.post('/auth/login', validate({ body: s.login }), authController.login)

  // --- Items (wajib login) ---
  const items = Router()
  items.use(authenticate)
  items.post('/', validate({ body: s.itemBody }), itemController.create)
  items.get('/', validate({ query: s.listQuery }), itemController.list)
  items.get('/:id', validate({ params: s.idParam }), itemController.getById)
  items.put('/:id', validate({ params: s.idParam, body: s.itemBody }), itemController.update)
  items.delete('/:id', validate({ params: s.idParam }), itemController.remove)
  items.post(
    '/:id/decrease-stock',
    validate({ params: s.idParam, body: s.decreaseStockBody }),
    itemController.decreaseStock,
  )
  router.use('/items', items)

  return router
}

module.exports = { createRoutes }
