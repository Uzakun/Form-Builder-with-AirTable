const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/airtable/test-connection
// @desc    Test Airtable connection (matches frontend call)
// @access  Private
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing Airtable connection for user:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      console.log('❌ No user or access token found');
      return res.status(401).json({ 
        success: false,
        message: 'No Airtable access token found' 
      });
    }
    
    console.log('✅ User found, testing connection...');
    
    // Test connection by getting user info
    const response = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    console.log('✅ Airtable connection successful');
    
    res.json({
      success: true,
      connected: true,
      airtableUser: response.data,
      message: 'Airtable connection successful'
    });
    
  } catch (error) {
    console.error('💥 Airtable test error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      connected: false,
      message: 'Airtable connection failed',
      error: error.response?.data || error.message 
    });
  }
});

// @route   GET /api/airtable/bases
// @desc    Get user's Airtable bases
// @access  Private
router.get('/bases', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching bases for user:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      console.log('❌ No user or access token found');
      return res.status(401).json({ message: 'No Airtable access token found' });
    }
    
    console.log('✅ User found, making API request to Airtable...');
    
    // Fetch bases from Airtable
    const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    console.log('✅ Fetched bases successfully:', response.data.bases.length, 'bases');
    
    res.json({
      bases: response.data.bases
    });
    
  } catch (error) {
    console.error('💥 Fetch bases error:', error.response?.data || error.message);
    console.error('Error details:', error.response?.status, error.response?.statusText);
    
    if (error.response?.status === 401) {
      res.status(401).json({ 
        message: 'Invalid Airtable access token' 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch Airtable bases',
        error: error.response?.data || error.message 
      });
    }
  }
});

// @route   GET /api/airtable/bases/:baseId/tables
// @desc    Get tables for a specific base
// @access  Private
router.get('/bases/:baseId/tables', authenticateToken, async (req, res) => {
  try {
    const { baseId } = req.params;
    console.log('🔍 Fetching tables for base:', baseId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      return res.status(401).json({ message: 'No Airtable access token found' });
    }
    
    // Fetch base schema from Airtable
    const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    console.log('✅ Fetched tables successfully:', response.data.tables.length, 'tables');
    
    res.json({
      tables: response.data.tables
    });
    
  } catch (error) {
    console.error('💥 Fetch tables error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({ 
        message: 'Invalid Airtable access token' 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch tables',
        error: error.response?.data || error.message 
      });
    }
  }
});

// @route   GET /api/airtable/bases/:baseId/tables/:tableId/fields
// @desc    Get fields for a specific table
// @access  Private
router.get('/bases/:baseId/tables/:tableId/fields', authenticateToken, async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    console.log('🔍 Fetching fields for table:', tableId, 'in base:', baseId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      return res.status(401).json({ message: 'No Airtable access token found' });
    }
    
    // Get table schema which includes fields
    const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    // Find the specific table
    const table = response.data.tables.find(t => t.id === tableId || t.name === tableId);
    
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    console.log('✅ Found table with fields:', table.fields.length);
    
    res.json({
      fields: table.fields,
      table: {
        id: table.id,
        name: table.name,
        description: table.description
      }
    });
    
  } catch (error) {
    console.error('💥 Fetch fields error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to fetch table fields',
      error: error.response?.data || error.message 
    });
  }
});

// @route   POST /api/airtable/bases/:baseId/tables/:tableId/records
// @desc    Create a new record in a table
// @access  Private
router.post('/bases/:baseId/tables/:tableId/records', authenticateToken, async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const { fields } = req.body;
    
    console.log('📝 Creating record in base:', baseId, 'table:', tableId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      return res.status(401).json({ message: 'No Airtable access token found' });
    }
    
    // Create record in Airtable
    const response = await axios.post(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        fields: fields
      },
      {
        headers: {
          'Authorization': `Bearer ${user.airtableAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Record created successfully:', response.data.id);
    
    res.json({
      success: true,
      record: response.data
    });
    
  } catch (error) {
    console.error('💥 Create record error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({ 
        message: 'Invalid Airtable access token' 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create record',
        error: error.response?.data || error.message 
      });
    }
  }
});

// @route   POST /api/airtable/test-connection
// @desc    Test Airtable connection (matches frontend call)
// @access  Private
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing Airtable connection for user:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      console.log('❌ No user or access token found');
      return res.status(401).json({ 
        success: false,
        message: 'No Airtable access token found' 
      });
    }
    
    console.log('✅ User found, testing connection...');
    
    // Test connection by getting user info
    const response = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    console.log('✅ Airtable connection successful');
    
    res.json({
      success: true,
      connected: true,
      airtableUser: response.data,
      message: 'Airtable connection successful'
    });
    
  } catch (error) {
    console.error('💥 Airtable test error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      connected: false,
      message: 'Airtable connection failed',
      error: error.response?.data || error.message 
    });
  }
});

// @route   GET /api/airtable/test
// @desc    Test Airtable connection (GET version)
// @access  Private
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.airtableAccessToken) {
      return res.status(401).json({ message: 'No Airtable access token found' });
    }
    
    // Test connection by getting user info
    const response = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${user.airtableAccessToken}`
      }
    });
    
    res.json({
      success: true,
      airtableUser: response.data,
      message: 'Airtable connection successful'
    });
    
  } catch (error) {
    console.error('Airtable test error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Airtable connection failed',
      error: error.response?.data || error.message 
    });
  }
});

module.exports = router;