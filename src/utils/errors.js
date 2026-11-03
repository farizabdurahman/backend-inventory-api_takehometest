class AppError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

module.exports = {
  AppError,
  badRequest: (msg, details) => new AppError(400, msg, details),
  unauthorized: (msg = 'Tidak terautentikasi') => new AppError(401, msg),
  notFound: (msg = 'Data tidak ditemukan') => new AppError(404, msg),
  conflict: (msg) => new AppError(409, msg),
}
