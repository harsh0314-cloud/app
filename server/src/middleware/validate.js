const { AppError } = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const message = issues.length ? issues.map(e => e.message).join(', ') : 'Invalid request data';
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validate };