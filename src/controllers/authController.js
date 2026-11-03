// Controller: menerjemahkan HTTP <-> service. Tanpa logika bisnis.
function createAuthController(authService) {
  return {
    async register(req, res) {
      const user = await authService.register(req.valid.body)
      res.status(201).json({ data: user })
    },

    async login(req, res) {
      const result = await authService.login(req.valid.body)
      res.json({ data: result })
    },
  }
}

module.exports = { createAuthController }
