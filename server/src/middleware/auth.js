const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in.', 401));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await req.prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!req.user || !req.user.isActive) {
      return next(new AppError('User no longer exists or is deactivated.', 401));
    }
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

module.exports = { generateToken, authenticate, JWT_SECRET }; 