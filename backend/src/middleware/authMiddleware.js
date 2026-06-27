const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

/**
 * Middleware to authenticate requests using JWT
 */
const protect = async (req, res, next) => {
  try {
    // Development bypass for local Next.js frontend integration
    if (process.env.NODE_ENV === 'development' && req.headers['x-bypass-auth'] === 'true') {
      const bypassRole = req.headers['x-bypass-role'] || 'ADMIN';
      const bypassUsername = bypassRole === 'ADMIN' ? 'admin' : bypassRole === 'MENTOR' ? 'mentor' : 'student';
      const bypassEmail = bypassRole === 'ADMIN' ? 'admin@example.com' : bypassRole === 'MENTOR' ? 'mentor@synapse.com' : 'student@example.com';
      
      let dbUser = await prisma.user.findFirst({ 
        where: bypassRole === 'MENTOR' ? { email: 'mentor@synapse.com' } : { role: bypassRole } 
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            username: bypassUsername,
            email: bypassEmail,
            password: 'devbypasshashedpassword',
            role: bypassRole === 'MENTOR' ? 'USER' : bypassRole,
          }
        });
      }
      req.user = dbUser;
      return next();
    }

    let token;

    // Check Authorization header for Bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Token missing.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = parseInt(decoded.id, 10);
    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload: user ID must be an integer.',
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Grant access and store user info in request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired. Please log in again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to an internal server error.',
    });
  }
};

/**
 * Middleware to restrict route access to specific roles
 * @param {...string} roles - List of allowed roles (e.g., 'ADMIN')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const email = req.user?.email || "";
    const emailLower = email.toLowerCase();

    // Dynamically map role based on email keyword or DB role
    const isEmailAdmin = emailLower.includes('admin');
    const isEmailMentor = emailLower.includes('mentor') || emailLower === 'mentor@synapse.com';
    const effectiveRole = isEmailAdmin ? 'ADMIN' : (isEmailMentor ? 'MENTOR' : userRole);

    const isAllowedRole = roles.includes(effectiveRole);
    // Mentors are allowed access to ADMIN routes as well
    const isAllowedMentor = (roles.includes('MENTOR') || roles.includes('ADMIN')) && (effectiveRole === 'MENTOR');
    // Institute admins are allowed access to ADMIN routes as well
    const isAllowedInstAdmin = roles.includes('ADMIN') && (effectiveRole === 'INSTITUTE_ADMIN');

    if (!req.user || (!isAllowedRole && !isAllowedMentor && !isAllowedInstAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

/**
 * Middleware to check JWT token optionally. If token is invalid or missing,
 * the request is still allowed to proceed but req.user remains undefined.
 */
const fetchUserIfExists = async (req, res, next) => {
  try {
    // Development bypass — same as protect middleware
    if (process.env.NODE_ENV === 'development' && req.headers['x-bypass-auth'] === 'true') {
      const bypassRole = req.headers['x-bypass-role'] || 'USER';
      const bypassUsername = bypassRole === 'ADMIN' ? 'admin' : bypassRole === 'MENTOR' ? 'mentor' : 'student';
      const bypassEmail = bypassRole === 'ADMIN' ? 'admin@example.com' : bypassRole === 'MENTOR' ? 'mentor@synapse.com' : 'student@example.com';

      let dbUser = await prisma.user.findFirst({ 
        where: bypassRole === 'MENTOR' ? { email: 'mentor@synapse.com' } : { role: bypassRole } 
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            username: bypassUsername,
            email: bypassEmail,
            password: 'devbypasshashedpassword',
            role: bypassRole,
          }
        });
      }
      req.user = dbUser;
      return next();
    }

    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // If token is invalid or expired, proceed without throwing error (anonymous view)
    next();
  }
};

module.exports = {
  protect,
  restrictTo,
  fetchUserIfExists,
};
