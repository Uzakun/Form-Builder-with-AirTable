const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   GET /api/auth/airtable
// @desc    Initiate Airtable OAuth flow
// @access  Public
router.get('/airtable', (req, res) => {
  console.log('🚀 Starting OAuth flow');
  
  const crypto = require('crypto');
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  // Generate state
  const state = crypto.randomBytes(16).toString('hex');
  
  // Ensure session exists
  if (!req.session) {
    console.log('❌ No session found, creating new one');
    req.session = {};
  }
  
  // Store both state and code verifier in session
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  
  // Force session save
  req.session.save((err) => {
    if (err) {
      console.log('❌ Session save error:', err);
    } else {
      console.log('✅ Session saved with state:', state);
      console.log('✅ Code verifier saved:', codeVerifier.substring(0, 10) + '...');
    }
  });
  
  console.log('📝 Set session state:', state);
  console.log('📝 Code challenge:', codeChallenge);
  console.log('📝 Session ID:', req.sessionID);
  
  const authUrl = new URL('https://airtable.com/oauth2/v1/authorize');
  authUrl.searchParams.append('client_id', process.env.AIRTABLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.AIRTABLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'data.records:read data.records:write schema.bases:read');
  authUrl.searchParams.append('state', state);
  
  // Add PKCE parameters
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  console.log('🔗 Generated auth URL with PKCE');
  
  res.json({ authUrl: authUrl.toString() });
});

// @route   GET /api/auth/airtable/callback
// @desc    Handle Airtable OAuth callback
// @access  Public
router.get('/airtable-simple', (req, res) => {
  console.log('🚀 Simple OAuth flow');
  
  const state = Math.random().toString(36).substring(2, 15);
  req.session.oauthState = state;
  
  const authUrl = new URL('https://airtable.com/oauth2/v1/authorize');
  authUrl.searchParams.append('client_id', process.env.AIRTABLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.AIRTABLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'data.records:read data.records:write schema.bases:read');
  authUrl.searchParams.append('state', state);
  // NO PKCE - just basic OAuth
  
  console.log('Auth URL:', authUrl.toString());
  res.json({ authUrl: authUrl.toString() });
});

// Simple callback without PKCE
router.get('/airtable/simple-callback', async (req, res) => {
  console.log('🎯 Simple callback hit');
  console.log('Query:', req.query);
  
  const { code, state, error } = req.query;
  
  if (error) {
    console.log('❌ Error:', error);
    return res.json({ error: true, message: error });
  }
  
  if (!code) {
    return res.json({ error: true, message: 'No code' });
  }
  
  try {
    // Simple token exchange without PKCE
    const tokenResponse = await axios.post('https://airtable.com/oauth2/v1/token', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
      client_id: process.env.AIRTABLE_CLIENT_ID,
      client_secret: process.env.AIRTABLE_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Token success:', tokenResponse.data);
    res.json({ success: true, token: tokenResponse.data });
    
  } catch (error) {
    console.log('💥 Token error:', error.response?.data);
    res.json({ error: true, tokenError: error.response?.data });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh Airtable access token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableRefreshToken) {
      return res.status(401).json({ message: 'No refresh token available' });
    }
    
    const refreshResponse = await axios.post('https://airtable.com/oauth2/v1/token', {
      grant_type: 'refresh_token',
      refresh_token: user.airtableRefreshToken,
      client_id: process.env.AIRTABLE_CLIENT_ID,
      client_secret: process.env.AIRTABLE_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    
    // Update user tokens
    user.airtableAccessToken = access_token;
    if (refresh_token) {
      user.airtableRefreshToken = refresh_token;
    }
    user.airtableTokenExpiresAt = new Date(Date.now() + (expires_in * 1000));
    
    await user.save();
    
    res.json({ message: 'Token refreshed successfully' });
    
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if token needs refresh
    if (user.isTokenExpired()) {
      return res.status(401).json({ message: 'Token expired', needsRefresh: true });
    }
    
    res.json(user);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more secure implementation, you might want to blacklist the JWT
    // For now, we'll just clear any session data
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Failed to logout' });
  }
});

// @route   DELETE /api/auth/account
// @desc    Delete user account and revoke Airtable access
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // TODO: Revoke Airtable token if API supports it
    // This would require making a request to Airtable's revoke endpoint
    // Currently, Airtable doesn't provide a token revocation endpoint
    
    // Delete all user's forms and responses
    const Form = require('../models/Form');
    const Response = require('../models/Response');
    
    // Find all user's forms
    const userForms = await Form.find({ userId: req.user.userId });
    const formIds = userForms.map(form => form._id);
    
    // Delete all responses for user's forms
    await Response.deleteMany({ formId: { $in: formIds } });
    
    // Delete all user's forms
    await Form.deleteMany({ userId: req.user.userId });
    
    // Delete user account
    await User.findByIdAndDelete(req.user.userId);
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });
    
    res.json({ message: 'Account and all associated data deleted successfully' });
    
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify JWT token validity
// @access  Private
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ valid: false, message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ valid: false, message: 'Account is inactive' });
    }
    
    // Check if Airtable token is expired
    if (user.isTokenExpired()) {
      return res.json({ 
        valid: true, 
        needsRefresh: true, 
        message: 'Airtable token expired, refresh required' 
      });
    }
    
    res.json({ 
      valid: true, 
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        lastLoginAt: user.lastLoginAt
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, message: 'Token verification failed' });
  }
});

// @route   POST /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.post('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update profile
    user.profile.name = name.trim();
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: user
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// @route   GET /api/auth/stats
// @desc    Get user account statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const Form = require('../models/Form');
    const Response = require('../models/Response');
    
    const userId = req.user.userId;
    
    // Get form counts
    const totalForms = await Form.countDocuments({ userId });
    const publishedForms = await Form.countDocuments({ userId, isPublished: true, isActive: true });
    const draftForms = await Form.countDocuments({ userId, isPublished: false });
    
    // Get response counts
    const userForms = await Form.find({ userId }).select('_id');
    const formIds = userForms.map(form => form._id);
    
    const totalResponses = await Response.countDocuments({ formId: { $in: formIds } });
    const syncedResponses = await Response.countDocuments({ 
      formId: { $in: formIds }, 
      'syncStatus.isSynced': true 
    });
    
    // Get recent activity
    const recentForms = await Form.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title updatedAt isPublished stats');
    
    // Calculate total views
    const totalViews = await Form.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$stats.totalViews' } } }
    ]);
    
    const stats = {
      forms: {
        total: totalForms,
        published: publishedForms,
        draft: draftForms,
        inactive: totalForms - publishedForms - draftForms
      },
      responses: {
        total: totalResponses,
        synced: syncedResponses,
        failed: totalResponses - syncedResponses
      },
      views: {
        total: totalViews[0]?.total || 0
      },
      recentActivity: recentForms
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get account statistics' });
  }
});


router.get('/airtable/test-callback', (req, res) => {
  console.log('🎯 Test callback hit!');
  console.log('Query params:', req.query);
  console.log('Session state:', req.session?.oauthState);
  console.log('Session ID:', req.sessionID);
  console.log('Received state:', req.query.state);
  
  // Check if we have an error from Airtable
  if (req.query.error) {
    console.log('❌ Airtable error:', req.query.error);
    return res.json({
      error: true,
      airtableError: req.query.error,
      description: req.query.error_description,
      receivedState: req.query.state,
      sessionState: req.session?.oauthState,
      message: 'Airtable returned an error - but callback is working!'
    });
  }
  
  res.json({
    message: 'Test callback successful!',
    query: req.query,
    url: req.url,
    sessionState: req.session?.oauthState,
    sessionId: req.sessionID,
    stateMatch: req.query.state === req.session?.oauthState,
    timestamp: new Date().toISOString()
  });
});

router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes working!', 
    availableRoutes: [
      'GET /api/auth/airtable',
      'GET /api/auth/airtable/callback', 
      'GET /api/auth/airtable/test-callback',
      'GET /api/auth/me',
      'POST /api/auth/refresh',
      'POST /api/auth/logout'
    ]
  });
});

module.exports = router;