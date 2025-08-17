const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/forms
// @desc    Create a new form
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Creating new form for user:', req.user.userId);
    console.log('Form data:', req.body);
    
    const {
      title,
      description,
      airtableBaseId,
      airtableTableId,
      fields,
      settings
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Form title is required' });
    }
    
    if (!airtableBaseId || !airtableTableId) {
      return res.status(400).json({ message: 'Airtable base and table are required' });
    }
    
    // Create form data object
    const formData = {
      title,
      description: description || '',
      userId: req.user.userId,
      airtableBaseId,
      airtableTableId,
      fields: fields || [],
      settings: {
        allowMultipleSubmissions: settings?.allowMultipleSubmissions || false,
        showProgressBar: settings?.showProgressBar || false,
        submitButtonText: settings?.submitButtonText || 'Submit',
        ...settings
      },
      isPublished: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('✅ Form created successfully with data:', formData);
    
    res.status(201).json({
      success: true,
      form: formData,
      message: 'Form created successfully'
    });
    
  } catch (error) {
    console.error('💥 Create form error:', error);
    res.status(500).json({ 
      message: 'Failed to create form',
      error: error.message 
    });
  }
});

// @route   GET /api/forms
// @desc    Get all forms for the user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Getting forms for user:', req.user.userId);
    
    // For now, return mock data since we're not using database
    const mockForms = [
      {
        _id: 'mock-form-1',
        title: 'Test Form',
        description: 'Testing form',
        isPublished: false,
        isActive: true,
        stats: {
          totalViews: 0,
          totalSubmissions: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('✅ Returning forms:', mockForms.length);
    
    res.json({
      forms: mockForms,
      count: mockForms.length
    });
    
  } catch (error) {
    console.error('💥 Get forms error:', error);
    res.status(500).json({ 
      message: 'Failed to get forms',
      error: error.message 
    });
  }
});

module.exports = router;