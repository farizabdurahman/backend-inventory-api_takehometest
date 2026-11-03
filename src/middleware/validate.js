const { badRequest } = require('../utils/errors')

/**
 * Middleware validasi. Contoh: validate({ body: schema, params: schema, query: schema }).
 * Data yang valid (sudah di-parse/dibersihkan) disimpan di req.valid.
 */
function validate(schemas) {
  return (req, _res, next) => {
    const issues = []
    req.valid = {}

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue
      const result = schemas[part].safeParse(req[part] ?? {})
      if (result.success) {
        req.valid[part] = result.data
      } else {
        for (const issue of result.error.issues) {
          issues.push({ in: part, field: issue.path.join('.') || '(root)', message: issue.message })
        }
      }
    }

    if (issues.length) return next(badRequest('Validasi gagal', issues))
    next()
  }
}

module.exports = { validate }
