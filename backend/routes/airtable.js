const express = require('express');
const axios = require('axios');
const { authenticateToken, getAirtableToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(getAirtableToken);

// Helper function to make Airtable API calls
const makeAirtableRequest = async (token, endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method,
      url: `${process.env.AIRTABLE_API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PATCH')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Airtable API error:', error.response?.data || error.message);
    throw error;
  }
};

// @route   GET /api/airtable/bases
// @desc    Get all accessible bases for the user
// @access  Private
router.get('/bases', async (req, res) => {
  try {
    const data = await makeAirtableRequest(req.airtableToken, '/meta/bases');
    
    // Transform the data to include only what we need
    const bases = data.bases.map(base => ({
      id: base.id,
      name: base.name,
      permissionLevel: base.permissionLevel
    }));
    
    res.json({ bases });
    
  } catch (error) {
    console.error('Get bases error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch bases',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   GET /api/airtable/bases/:baseId/tables
// @desc    Get all tables in a specific base
// @access  Private
router.get('/bases/:baseId/tables', async (req, res) => {
  try {
    const { baseId } = req.params;
    const data = await makeAirtableRequest(req.airtableToken, `/meta/bases/${baseId}/tables`);
    
    // Transform the data to include only what we need
    const tables = data.tables.map(table => ({
      id: table.id,
      name: table.name,
      description: table.description,
      primaryFieldId: table.primaryFieldId,
      fields: table.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        description: field.description,
        options: field.options
      }))
    }));
    
    res.json({ tables });
    
  } catch (error) {
    console.error('Get tables error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Base not found' });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch tables',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   GET /api/airtable/bases/:baseId/tables/:tableId/fields
// @desc    Get all fields in a specific table
// @access  Private
router.get('/bases/:baseId/tables/:tableId/fields', async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const data = await makeAirtableRequest(req.airtableToken, `/meta/bases/${baseId}/tables`);
    
    // Find the specific table
    const table = data.tables.find(t => t.id === tableId);
    
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Filter fields to only supported types for form building
    const supportedTypes = ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelect', 'attachment'];
    
    const fields = table.fields
      .filter(field => supportedTypes.includes(field.type))
      .map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        description: field.description,
        options: field.options
      }));
    
    res.json({ 
      fields,
      tableInfo: {
        id: table.id,
        name: table.name,
        description: table.description,
        primaryFieldId: table.primaryFieldId
      }
    });
    
  } catch (error) {
    console.error('Get fields error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch fields',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   POST /api/airtable/bases/:baseId/tables/:tableId/records
// @desc    Create a new record in Airtable
// @access  Private
router.post('/bases/:baseId/tables/:tableId/records', async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const { fields } = req.body;
    
    if (!fields || typeof fields !== 'object') {
      return res.status(400).json({ message: 'Fields object is required' });
    }
    
    const data = await makeAirtableRequest(
      req.airtableToken, 
      `/${baseId}/${tableId}`,
      'POST',
      {
        fields: fields,
        typecast: true // Allow Airtable to convert field types
      }
    );
    
    res.json({ 
      success: true,
      recordId: data.id,
      record: data
    });
    
  } catch (error) {
    console.error('Create record error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    if (error.response?.status === 422) {
      return res.status(422).json({ 
        message: 'Invalid field data',
        details: error.response.data.error
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create record',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   GET /api/airtable/bases/:baseId/tables/:tableId/records
// @desc    Get records from a table (for testing/preview)
// @access  Private
router.get('/bases/:baseId/tables/:tableId/records', async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const { maxRecords = 10, offset } = req.query;
    
    let endpoint = `/${baseId}/${tableId}?maxRecords=${maxRecords}`;
    if (offset) {
      endpoint += `&offset=${offset}`;
    }
    
    const data = await makeAirtableRequest(req.airtableToken, endpoint);
    
    res.json(data);
    
  } catch (error) {
    console.error('Get records error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch records',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   POST /api/airtable/test-connection
// @desc    Test Airtable connection
// @access  Private
router.post('/test-connection', async (req, res) => {
  try {
    const data = await makeAirtableRequest(req.airtableToken, '/meta/whoami');
    
    res.json({ 
      success: true,
      user: data,
      message: 'Connection successful'
    });
    
  } catch (error) {
    console.error('Test connection error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Airtable authorization expired',
        needsRefresh: true 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Connection failed',
      error: error.response?.data?.error || error.message
    });
  }
});

module.exports = router;