const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/AppError');

// Change Password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Get user with password included
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      return next(new AppError('User not found or uses OAuth', 400));
    }

    // 2. Check current password
    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // 3. Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ status: 'success', message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};