const express = require('express');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { authenticateToken, checkOwnership, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/forms
// @desc    Create a new form
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      airtableBaseId,
      airtableBaseName,
      airtableTableId,
      airtableTableName,
      fields,
      settings
    } = req.body;

    // Validation
    if (!title || !airtableBaseId || !airtableTableId || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, airtableBaseId, airtableTableId, fields' 
      });
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'At least one field is required' });
    }

    // Validate field structure
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.airtableFieldId || !field.airtableFieldName || !field.airtableFieldType || !field.label) {
        return res.status(400).json({ 
          message: `Field ${i + 1} is missing required properties` 
        });
      }
    }

    // Create form
    const form = new Form({
      title,
      description,
      userId: req.user.userId,
      airtableBaseId,
      airtableBaseName,
      airtableTableId,
      airtableTableName,
      fields: fields.map((field, index) => ({
        ...field,
        order: field.order || index
      })),
      settings: {
        ...form.settings,
        ...settings
      }
    });

    await form.save();

    res.status(201).json({
      message: 'Form created successfully',
      form: form
    });

  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ 
      message: 'Failed to create form',
      error: error.message
    });
  }
});

// @route   GET /api/forms
// @desc    Get all forms for the authenticated user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = { userId: req.user.userId };
    
    // Filter by status
    if (status) {
      if (status === 'published') {
        query.isPublished = true;
        query.isActive = true;
      } else if (status === 'draft') {
        query.isPublished = false;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const forms = await Form.find(query)
      .select('title description isActive isPublished stats airtableBaseName airtableTableName createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Form.countDocuments(query);

    res.json({
      forms,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalForms: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch forms',
      error: error.message
    });
  }
});

// @route   GET /api/forms/:id
// @desc    Get a specific form by ID
// @access  Private (owner) or Public (if published)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check access permissions
    const isOwner = req.user && form.userId.toString() === req.user.userId;
    const isPublic = form.isPublished && form.isActive;

    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count for published forms
    if (isPublic && !isOwner) {
      await form.incrementViews();
    }

    res.json({ form });

  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch form',
      error: error.message
    });
  }
});

// @route   PUT /api/forms/:id
// @desc    Update a form
// @access  Private (owner only)
router.put('/:id', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const {
      title,
      description,
      fields,
      settings,
      isActive,
      isPublished
    } = req.body;

    const form = req.resource;

    // Update fields
    if (title) form.title = title;
    if (description !== undefined) form.description = description;
    if (fields && Array.isArray(fields)) {
      // Validate fields
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (!field.airtableFieldId || !field.airtableFieldName || !field.airtableFieldType || !field.label) {
          return res.status(400).json({ 
            message: `Field ${i + 1} is missing required properties` 
          });
        }
      }
      
      form.fields = fields.map((field, index) => ({
        ...field,
        order: field.order || index
      }));
    }
    
    if (settings) {
      form.settings = {
        ...form.settings.toObject(),
        ...settings
      };
    }
    
    if (isActive !== undefined) form.isActive = isActive;
    if (isPublished !== undefined) form.isPublished = isPublished;

    await form.save();

    res.json({
      message: 'Form updated successfully',
      form
    });

  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ 
      message: 'Failed to update form',
      error: error.message
    });
  }
});

// @route   DELETE /api/forms/:id
// @desc    Delete a form
// @access  Private (owner only)
router.delete('/:id', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const form = req.resource;

    // Delete associated responses
    await Response.deleteMany({ formId: form._id });

    // Delete the form
    await Form.findByIdAndDelete(form._id);

    res.json({ message: 'Form deleted successfully' });

  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ 
      message: 'Failed to delete form',
      error: error.message
    });
  }
});

// @route   POST /api/forms/:id/duplicate
// @desc    Duplicate a form
// @access  Private (owner only)
router.post('/:id/duplicate', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const originalForm = req.resource;
    const { title } = req.body;

    const duplicateForm = new Form({
      title: title || `${originalForm.title} (Copy)`,
      description: originalForm.description,
      userId: req.user.userId,
      airtableBaseId: originalForm.airtableBaseId,
      airtableBaseName: originalForm.airtableBaseName,
      airtableTableId: originalForm.airtableTableId,
      airtableTableName: originalForm.airtableTableName,
      fields: originalForm.fields.map(field => field.toObject()),
      settings: originalForm.settings.toObject(),
      isActive: true,
      isPublished: false // New form starts as draft
    });

    await duplicateForm.save();

    res.status(201).json({
      message: 'Form duplicated successfully',
      form: duplicateForm
    });

  } catch (error) {
    console.error('Duplicate form error:', error);
    res.status(500).json({ 
      message: 'Failed to duplicate form',
      error: error.message
    });
  }
});

// @route   POST /api/forms/:id/publish
// @desc    Publish/unpublish a form
// @access  Private (owner only)
router.post('/:id/publish', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const form = req.resource;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ message: 'isPublished must be a boolean' });
    }

    form.isPublished = isPublished;
    await form.save();

    res.json({
      message: `Form ${isPublished ? 'published' : 'unpublished'} successfully`,
      form: {
        id: form._id,
        isPublished: form.isPublished,
        shareUrl: form.shareSettings.shareUrl
      }
    });

  } catch (error) {
    console.error('Publish form error:', error);
    res.status(500).json({ 
      message: 'Failed to update form status',
      error: error.message
    });
  }
});

// @route   GET /api/forms/:id/analytics
// @desc    Get form analytics
// @access  Private (owner only)
router.get('/:id/analytics', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const form = req.resource;
    const { startDate, endDate } = req.query;

    // Get basic form stats
    const formStats = {
      totalViews: form.stats.totalViews,
      totalSubmissions: form.stats.totalSubmissions,
      conversionRate: form.stats.conversionRate
    };

    // Get detailed analytics from responses
    const analytics = await Response.getFormAnalytics(form._id, startDate, endDate);

    res.json({
      formStats,
      analytics: analytics[0] || {
        totalResponses: 0,
        successfulSubmissions: 0,
        averageCompletionTime: 0,
        responsesByDay: []
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// @route   GET /api/forms/:id/responses
// @desc    Get all responses for a form
// @access  Private (owner only)
router.get('/:id/responses', authenticateToken, checkOwnership(Form), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const form = req.resource;

    const query = { formId: form._id };
    
    if (status) {
      query.status = status;
    }

    const responses = await Response.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Response.countDocuments(query);

    res.json({
      responses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalResponses: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
});

module.exports = router;