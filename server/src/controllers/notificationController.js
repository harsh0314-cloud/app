const { AppError } = require('../utils/AppError');

// GET /api/users/notifications — list current user's notifications
exports.listNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      req.prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      req.prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.status(200).json({ status: 'success', data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/notifications/:id/read — mark one as read
exports.markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.notification.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return next(new AppError('Notification not found', 404));
    await req.prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.status(200).json({ status: 'success', message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/notifications/read-all — mark all as read
exports.markAllRead = async (req, res, next) => {
  try {
    await req.prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
