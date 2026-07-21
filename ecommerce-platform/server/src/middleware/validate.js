const { AppError } = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map(e => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validate };