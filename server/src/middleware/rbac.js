const { AppError } = require('../utils/AppError');

// roles should be an array like ['ADMIN', 'SUPER_ADMIN']
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};