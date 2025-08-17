const express = require('express');
const axios = require('axios');
const multer = require('multer');
const Form = require('../models/Form');
const Response = require('../models/Response');
const User = require('../models/User');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per field
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Helper function to process conditional logic
const evaluateCondition = (condition, responses) => {
  const { fieldId, operator, value } = condition;
  const fieldResponse = responses.find(r => r.fieldId === fieldId);
  const fieldValue = fieldResponse ? fieldResponse.value : null;

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
    case 'not_contains':
      return !fieldValue || !fieldValue.toString().toLowerCase().includes(value.toLowerCase());
    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return true;
  }
};

// Helper function to check if field should be shown
const shouldShowField = (field, responses) => {
  if (!field.showWhen || field.showWhen.length === 0) {
    return true;
  }

  // All conditions must be true (AND logic)
  return field.showWhen.every(condition => evaluateCondition(condition, responses));
};

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

// @route   POST /api/responses/submit/:formId
// @desc    Submit a form response
// @access  Public (with optional auth)
router.post('/submit/:formId', optionalAuth, upload.any(), async (req, res) => {
  try {
    const { formId } = req.params;
    const submissionData = req.body;
    const files = req.files || [];

    // Get the form
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.isActive || !form.isPublished) {
      return res.status(403).json({ message: 'Form is not available' });
    }

    // Get form owner to access their Airtable token
    const formOwner = await User.findById(form.userId);
    if (!formOwner || !formOwner.airtableAccessToken) {
      return res.status(500).json({ message: 'Form configuration error' });
    }

    // Parse submission data
    const responses = [];
    const airtableFields = {};

    // Process each form field
    for (const field of form.fields) {
      const fieldValue = submissionData[field.airtableFieldId];
      
      if (fieldValue !== undefined && fieldValue !== '') {
        // Handle different field types
        let processedValue = fieldValue;
        
        if (field.airtableFieldType === 'multipleSelect' && typeof fieldValue === 'string') {
          processedValue = fieldValue.split(',').map(v => v.trim());
        }
        
        responses.push({
          fieldId: field.airtableFieldId,
          fieldLabel: field.label,
          fieldType: field.airtableFieldType,
          value: processedValue
        });
        
        airtableFields[field.airtableFieldName] = processedValue;
      }
    }

    // Handle file uploads
    if (files.length > 0) {
      // Group files by field
      const filesByField = {};
      files.forEach(file => {
        const fieldName = file.fieldname;
        if (!filesByField[fieldName]) {
          filesByField[fieldName] = [];
        }
        filesByField[fieldName].push(file);
      });

      // Process file fields
      for (const [fieldName, fieldFiles] of Object.entries(filesByField)) {
        const field = form.fields.find(f => f.airtableFieldId === fieldName);
        if (field && field.airtableFieldType === 'attachment') {
          // For demo purposes, we'll create a placeholder for file upload
          // In a real app, you'd upload to a file storage service
          const attachments = fieldFiles.map(file => ({
            url: `https://example.com/uploads/${file.originalname}`,
            filename: file.originalname
          }));
          
          airtableFields[field.airtableFieldName] = attachments;
          
          const responseIndex = responses.findIndex(r => r.fieldId === fieldName);
          if (responseIndex >= 0) {
            responses[responseIndex].files = fieldFiles.map(file => ({
              originalName: file.originalname,
              filename: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              url: `https://example.com/uploads/${file.originalname}`
            }));
          } else {
            responses.push({
              fieldId: fieldName,
              fieldLabel: field.label,
              fieldType: field.airtableFieldType,
              value: attachments,
              files: fieldFiles.map(file => ({
                originalName: file.originalname,
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                url: `https://example.com/uploads/${file.originalname}`
              }))
            });
          }
        }
      }
    }

    // Validate required fields
    const visibleFields = form.fields.filter(field => shouldShowField(field, responses));
    const requiredFields = visibleFields.filter(field => field.required);
    
    for (const field of requiredFields) {
      const hasResponse = responses.some(r => r.fieldId === field.airtableFieldId && r.value);
      if (!hasResponse) {
        return res.status(400).json({ 
          message: `Field "${field.label}" is required`,
          missingField: field.airtableFieldId
        });
      }
    }

    // Create response record
    const responseRecord = new Response({
      formId: form._id,
      airtableBaseId: form.airtableBaseId,
      airtableTableId: form.airtableTableId,
      responses,
      submittedBy: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer'),
        email: submissionData.email,
        name: submissionData.name
      },
      status: 'pending',
      metadata: {
        timeToComplete: parseInt(submissionData.timeToComplete) || 0,
        deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        browserInfo: req.get('User-Agent')
      }
    });

    await responseRecord.save();

    // Try to submit to Airtable
    try {
      const airtableRecord = await makeAirtableRequest(
        formOwner.airtableAccessToken,
        `/${form.airtableBaseId}/${form.airtableTableId}`,
        'POST',
        {
          fields: airtableFields,
          typecast: true
        }
      );

      // Mark as synced
      await responseRecord.markAsSynced(airtableRecord.id);
      
      // Increment form submission count
      await form.incrementSubmissions();

      res.json({
        success: true,
        message: form.settings.successMessage || 'Thank you for your submission!',
        responseId: responseRecord._id,
        redirectUrl: form.settings.redirectUrl
      });

    } catch (airtableError) {
      console.error('Airtable submission error:', airtableError.response?.data || airtableError.message);
      
      // Update response with error
      await responseRecord.addError(
        'Failed to sync with Airtable',
        airtableError.response?.data || airtableError.message
      );

      // Still return success to user, but log the sync issue
      res.json({
        success: true,
        message: form.settings.successMessage || 'Thank you for your submission!',
        responseId: responseRecord._id,
        note: 'Response saved locally, will sync later'
      });
    }

  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ 
      message: 'Failed to submit response',
      error: error.message
    });
  }
});

// @route   POST /api/responses/validate/:formId
// @desc    Validate form responses (for real-time validation)
// @access  Public
router.post('/validate/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const { responses } = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const errors = {};
    const visibleFields = [];

    // Check which fields should be visible
    for (const field of form.fields) {
      if (shouldShowField(field, responses)) {
        visibleFields.push(field);
        
        // Check required validation
        if (field.required) {
          const response = responses.find(r => r.fieldId === field.airtableFieldId);
          if (!response || !response.value || response.value === '') {
            errors[field.airtableFieldId] = `${field.label} is required`;
          }
        }
      }
    }

    res.json({
      valid: Object.keys(errors).length === 0,
      errors,
      visibleFields: visibleFields.map(f => ({
        id: f.airtableFieldId,
        label: f.label,
        type: f.airtableFieldType,
        required: f.required
      }))
    });

  } catch (error) {
    console.error('Validate response error:', error);
    res.status(500).json({ 
      message: 'Validation failed',
      error: error.message
    });
  }
});

// @route   GET /api/responses/:id
// @desc    Get a specific response
// @access  Private (form owner only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id).populate('formId');
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Check if user owns the form
    if (response.formId.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ response });

  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch response',
      error: error.message
    });
  }
});

// @route   POST /api/responses/:id/retry-sync
// @desc    Retry syncing a failed response to Airtable
// @access  Private (form owner only)
router.post('/:id/retry-sync', authenticateToken, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id).populate('formId');
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Check if user owns the form
    if (response.formId.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (response.syncStatus.isSynced) {
      return res.status(400).json({ message: 'Response is already synced' });
    }

    // Get form owner
    const formOwner = await User.findById(response.formId.userId);
    if (!formOwner || !formOwner.airtableAccessToken) {
      return res.status(500).json({ message: 'Form owner access token not found' });
    }

    // Prepare Airtable fields
    const airtableFields = {};
    response.responses.forEach(resp => {
      const field = response.formId.fields.find(f => f.airtableFieldId === resp.fieldId);
      if (field) {
        airtableFields[field.airtableFieldName] = resp.value;
      }
    });

    // Try to submit to Airtable
    const airtableRecord = await makeAirtableRequest(
      formOwner.airtableAccessToken,
      `/${response.airtableBaseId}/${response.airtableTableId}`,
      'POST',
      {
        fields: airtableFields,
        typecast: true
      }
    );

    // Mark as synced
    await response.markAsSynced(airtableRecord.id);

    res.json({
      success: true,
      message: 'Response synced successfully',
      airtableRecordId: airtableRecord.id
    });

  } catch (error) {
    console.error('Retry sync error:', error);
    
    // Update sync attempt
    if (response) {
      await response.updateSyncAttempt(error);
    }

    res.status(500).json({ 
      message: 'Failed to sync response',
      error: error.response?.data?.error || error.message
    });
  }
});

// @route   DELETE /api/responses/:id
// @desc    Delete a response
// @access  Private (form owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id).populate('formId');
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Check if user owns the form
    if (response.formId.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Response.findByIdAndDelete(req.params.id);

    res.json({ message: 'Response deleted successfully' });

  } catch (error) {
    console.error('Delete response error:', error);
    res.status(500).json({ 
      message: 'Failed to delete response',
      error: error.message
    });
  }
});

// @route   GET /api/responses/export/:formId
// @desc    Export form responses as CSV/JSON
// @access  Private (form owner only)
router.get('/export/:formId', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;
    const { format = 'csv', startDate, endDate } = req.query;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check ownership
    if (form.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build query
    const query = { formId: form._id };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const responses = await Response.find(query).sort({ createdAt: -1 });

    if (format === 'json') {
      res.json({ responses });
    } else {
      // CSV format
      const csvHeader = ['Submission Date', 'Status'];
      form.fields.forEach(field => {
        csvHeader.push(field.label);
      });

      const csvRows = [csvHeader.join(',')];
      
      responses.forEach(response => {
        const row = [
          response.createdAt.toISOString(),
          response.status
        ];
        
        form.fields.forEach(field => {
          const responseData = response.responses.find(r => r.fieldId === field.airtableFieldId);
          const value = responseData ? responseData.value : '';
          // Escape CSV values
          const escapedValue = typeof value === 'string' 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
          row.push(escapedValue);
        });
        
        csvRows.push(row.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${form.title}_responses.csv"`);
      res.send(csvRows.join('\n'));
    }

  } catch (error) {
    console.error('Export responses error:', error);
    res.status(500).json({ 
      message: 'Failed to export responses',
      error: error.message
    });
  }
});

module.exports = router;