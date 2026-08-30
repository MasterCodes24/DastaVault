const jwt = require('jsonwebtoken');

const verifyTokenAndRole = (requiredRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded; // Contains userId and role directly from JWT payload

      if (requiredRoles && !requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You do not have permission for this action.' });
      }

      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  };
};

module.exports = { verifyTokenAndRole };