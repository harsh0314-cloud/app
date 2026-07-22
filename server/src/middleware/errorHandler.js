const { logger } = require('../utils/logger');
const { AppError } = require('../utils/AppError');
const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  // UN-SILENCE THE ERROR: Force Render logs to show the exact crash
  console.error('RAW ERROR:', err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      err = new AppError('A record with this value already exists.', 409);
    } else if (err.code === 'P2025') {
      err = new AppError('Record not found.', 404);
    } else {
      err = new AppError('Database error occurred.', 500);
    }
  }

  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token.', 401);
  }

  // Final fallback just in case
  if (!err.message || err.message === 'Internal Server Error') {
    err.message = 'An unexpected error occurred.';
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
  err = new AppError('Invalid data provided.', 400);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};


module.exports = errorHandler;