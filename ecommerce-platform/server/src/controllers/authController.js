const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { AppError } = require('../utils/AppError');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const REFRESH_TTL_DAYS = 30;
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

// Create a refresh session (stores hashed token) and set httpOnly cookie
const issueRefreshToken = async (prisma, userId, req, res) => {
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      token: hashToken(raw),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
      expiresAt,
    },
  });
  res.cookie('refreshToken', raw, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  return raw;
};

// Create + email an email-verification token (non-blocking on failure)
const sendVerification = async (prisma, user) => {
  const raw = randomToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token: hashToken(raw),
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendVerificationEmail(user.email, raw, user.firstName);
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) return next(new AppError('Email already exists.', 409));

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true },
    });

    sendVerification(req.prisma, user).catch((e) => console.error('[auth] verification email failed:', e.message));

    const token = generateToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(req.prisma, user.id, req, res);
    res.status(201).json({ status: 'success', data: { user, token, refreshToken } });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return next(new AppError('Invalid email or password.', 401));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return next(new AppError('Invalid email or password.', 401));

    const token = generateToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(req.prisma, user.id, req, res);
    res.status(200).json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isVerified: user.isVerified },
        token,
        refreshToken,
      },
    });
  } catch (error) { next(error); }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, role: true, isVerified: true, isGuest: true },
    });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

// Anonymous guest session — lets shoppers build a cart + checkout without an account
exports.guestSession = async (req, res, next) => {
  try {
    const guestEmail = `guest_${crypto.randomBytes(8).toString('hex')}@guest.local`;
    const user = await req.prisma.user.create({
      data: { email: guestEmail, isGuest: true, role: 'USER', firstName: 'Guest' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true, isGuest: true },
    });
    const token = generateToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(req.prisma, user.id, req, res);
    res.status(201).json({ status: 'success', data: { user, token, refreshToken } });
  } catch (error) { next(error); }
};

// Attach real contact details to a guest at checkout time
exports.updateGuestDetails = async (req, res, next) => {
  try {
    const { email, firstName, lastName, phone } = req.body;
    const current = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!current) return next(new AppError('User not found.', 404));
    if (!current.isGuest) {
      return res.status(200).json({ status: 'success', data: { user: { id: current.id, email: current.email } } });
    }

    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (phone) data.phone = phone;
    if (email) {
      const taken = await req.prisma.user.findFirst({ where: { email, id: { not: current.id } } });
      // Only set the real email if it is not already used by another account
      if (!taken) data.email = email;
    }

    const user = await req.prisma.user.update({
      where: { id: current.id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isGuest: true },
    });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

// Rotate refresh token → issue new access + refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const raw = req.body.refreshToken || req.cookies?.refreshToken;
    if (!raw) return next(new AppError('Refresh token required.', 401));

    const session = await req.prisma.session.findUnique({ where: { token: hashToken(raw) } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await req.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return next(new AppError('Invalid or expired refresh token.', 401));
    }

    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) return next(new AppError('User no longer exists.', 401));

    // Rotate: delete old session, issue new
    await req.prisma.session.delete({ where: { id: session.id } });
    const token = generateToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(req.prisma, user.id, req, res);
    res.status(200).json({ status: 'success', data: { token, refreshToken } });
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    const raw = req.body.refreshToken || req.cookies?.refreshToken;
    if (raw) {
      await req.prisma.session.deleteMany({ where: { token: hashToken(raw) } });
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none' });
    res.status(200).json({ status: 'success', message: 'Logged out' });
  } catch (error) { next(error); }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const raw = req.body.token || req.query.token;
    if (!raw) return next(new AppError('Verification token required.', 400));

    const record = await req.prisma.verificationToken.findUnique({ where: { token: hashToken(raw) } });
    if (!record || record.type !== 'EMAIL_VERIFICATION' || record.expiresAt < new Date()) {
      return next(new AppError('Invalid or expired verification link.', 400));
    }

    await req.prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } });
    await req.prisma.verificationToken.delete({ where: { id: record.id } });
    res.status(200).json({ status: 'success', message: 'Email verified successfully.' });
  } catch (error) { next(error); }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError('User not found.', 404));
    if (user.isVerified) return res.status(200).json({ status: 'success', message: 'Email already verified.' });

    await req.prisma.verificationToken.deleteMany({ where: { userId: user.id, type: 'EMAIL_VERIFICATION' } });
    await sendVerification(req.prisma, user);
    res.status(200).json({ status: 'success', message: 'Verification email sent.' });
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Email is required.', 400));

    const user = await req.prisma.user.findUnique({ where: { email } });
    // Always respond success to avoid email enumeration
    if (user && user.password) {
      await req.prisma.verificationToken.deleteMany({ where: { userId: user.id, type: 'PASSWORD_RESET' } });
      const raw = randomToken();
      await req.prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: hashToken(raw),
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(user.email, raw, user.firstName).catch((e) => console.error('[auth] reset email failed:', e.message));
    }
    res.status(200).json({ status: 'success', message: 'If an account exists, a reset link has been sent.' });
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return next(new AppError('Token and new password are required.', 400));
    if (password.length < 8) return next(new AppError('Password must be at least 8 characters.', 400));

    const record = await req.prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
    if (!record || record.type !== 'PASSWORD_RESET' || record.expiresAt < new Date()) {
      return next(new AppError('Invalid or expired reset link.', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await req.prisma.$transaction([
      req.prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
      req.prisma.verificationToken.delete({ where: { id: record.id } }),
      // Invalidate all existing sessions for security
      req.prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    res.status(200).json({ status: 'success', message: 'Password reset successfully. Please sign in.' });
  } catch (error) { next(error); }
};
