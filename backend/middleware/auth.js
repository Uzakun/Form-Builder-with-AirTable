const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to get Airtable token for API calls
const getAirtableToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if token is expired
    if (user.isTokenExpired()) {
      return res.status(401).json({ 
        message: 'Airtable token expired', 
        needsRefresh: true 
      });
    }
    
    req.airtableToken = user.airtableAccessToken;
    req.userData = user;
    next();
    
  } catch (error) {
    console.error('Airtable token middleware error:', error);
    res.status(500).json({ message: 'Failed to get Airtable token' });
  }
};

// Middleware to check if user owns the resource
const checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (resource.userId.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      req.resource = resource;
      next();
      
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ message: 'Ownership verification failed' });
    }
  };
};

// Optional authentication middleware (for public forms)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = decoded;
        req.userData = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  getAirtableToken,
  checkOwnership,
  optionalAuth
};