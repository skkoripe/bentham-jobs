const { CODES, MESSAGES, errorResponseBody } = require('../constants/errors');

const notFound = (req, res) => {
  res.status(404).json(
    errorResponseBody(CODES.NOT_FOUND, MESSAGES[CODES.NOT_FOUND], 404, { path: req.originalUrl })
  );
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 404 ? CODES.NOT_FOUND : CODES.INTERNAL_SERVER_ERROR);
  const message = err.message || MESSAGES[code] || MESSAGES[CODES.INTERNAL_SERVER_ERROR];
  const details = err.details;

  const body = errorResponseBody(code, message, statusCode, details);
  res.status(statusCode).json(body);
};

module.exports = {
  notFound,
  errorHandler,
};
