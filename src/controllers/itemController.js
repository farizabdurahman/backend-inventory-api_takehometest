function createItemController(itemService) {
  return {
    create(req, res) {
      const item = itemService.create(req.valid.body, req.user.id)
      res.status(201).json({ data: item })
    },

    list(req, res) {
      res.json(itemService.list(req.valid.query))
    },

    getById(req, res) {
      res.json({ data: itemService.getById(req.valid.params.id) })
    },

    update(req, res) {
      res.json({ data: itemService.update(req.valid.params.id, req.valid.body) })
    },

    remove(req, res) {
      itemService.delete(req.valid.params.id)
      res.status(204).end()
    },

    decreaseStock(req, res) {
      const item = itemService.decreaseStock(req.valid.params.id, req.valid.body.quantity)
      res.json({ data: item })
    },
  }
}

module.exports = { createItemController }
