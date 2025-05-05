const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {

  //Auth skipping for ease in development mode
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    console.log('Authentication skipped in development mode');
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  try {
    //default secret for development
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };