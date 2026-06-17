const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password').populate('outlet', 'name');
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ message: 'Account deactivated or not found' });
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Role '${req.user.role}' is not permitted for this action` });
  }
  next();
};

module.exports = { protect, authorize };
