
const jwt = require('jsonwebtoken');

// Store active tokens (in production, use Redis or database)
const activeTokens = new Map();

const authenticateSimulator = async (req, res, next) => {
  // For development, you can skip auth if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_SIMULATOR_AUTH === 'true') {
    console.log('Simulator authentication skipped in development mode');
    // Mock simulator data for development
    req.simulatorData = {
      simulatorId: 'test-simulator',
      callbackUrl: 'http://localhost:8080'
    };
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const tokenData = activeTokens.get(token);
  
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Add simulator data to request
  req.simulatorData = tokenData;
  next();
};

// Helper functions for token management
const addToken = (token, data) => {
  activeTokens.set(token, data);
};

const removeToken = (token) => {
  activeTokens.delete(token);
};

const getTokenData = (token) => {
  return activeTokens.get(token);
};

module.exports = { 
  authenticateSimulator, 
  addToken, 
  removeToken, 
  getTokenData,
  activeTokens 
};