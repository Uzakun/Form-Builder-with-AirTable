const mongoose = require('mongoose');

// Schema for individual field responses
const fieldResponseSchema = new mongoose.Schema({
  fieldId: { type: String, required: true }, // Airtable field ID
  fieldLabel: { type: String, required: true },
  fieldType: { 
    type: String, 
    required: true,
    enum: ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelect', 'attachment']
  },
  value: mongoose.Schema.Types.Mixed, // Can be string, array, or file info
  
  // For file uploads
  files: [{
    originalName: String,
    filename: String,
    size: Number,
    mimetype: String,
    url: String
  }]
}, { _id: false });

// Main response schema
const responseSchema = new mongoose.Schema({
  // Form reference
  formId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Form', 
    required: true 
  },
  
  // Airtable references
  airtableBaseId: { type: String, required: true },
  airtableTableId: { type: String, required: true },
  airtableRecordId: String, // Set after successful submission to Airtable
  
  // Response data
  responses: [fieldResponseSchema],
  
  // Submission metadata
  submittedBy: {
    ip: String,
    userAgent: String,
    referrer: String,
    email: String, // If user provides email
    name: String   // If user provides name
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'submitted', 'failed', 'synced'],
    default: 'pending'
  },
  
  // Error handling
  errors: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Sync status with Airtable
  syncStatus: {
    lastSyncAttempt: Date,
    syncAttempts: { type: Number, default: 0 },
    lastSyncError: String,
    isSynced: { type: Boolean, default: false }
  },
  
  // Additional metadata
  metadata: {
    timeToComplete: Number, // Time in seconds
    deviceType: String,
    browserInfo: String,
    completionPercentage: { type: Number, default: 100 }
  }
}, {
  timestamps: true
});

// Indexes for performance
responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ status: 1 });
responseSchema.index({ airtableRecordId: 1 });
responseSchema.index({ 'submittedBy.email': 1 });
responseSchema.index({ 'syncStatus.isSynced': 1 });
responseSchema.index({ createdAt: -1 });

// Virtual for getting response as key-value pairs
responseSchema.virtual('responseData').get(function() {
  const data = {};
  this.responses.forEach(response => {
    data[response.fieldId] = response.value;
  });
  return data;
});

// Instance method to add error
responseSchema.methods.addError = function(message, details = null) {
  this.errors.push({
    message,
    details,
    timestamp: new Date()
  });
  this.status = 'failed';
  return this.save();
};

// Instance method to mark as synced
responseSchema.methods.markAsSynced = function(airtableRecordId) {
  this.airtableRecordId = airtableRecordId;
  this.status = 'synced';
  this.syncStatus.isSynced = true;
  this.syncStatus.lastSyncAttempt = new Date();
  return this.save();
};

// Instance method to update sync attempt
responseSchema.methods.updateSyncAttempt = function(error = null) {
  this.syncStatus.syncAttempts += 1;
  this.syncStatus.lastSyncAttempt = new Date();
  
  if (error) {
    this.syncStatus.lastSyncError = error.message || error;
    this.status = 'failed';
  }
  
  return this.save();
};

// Static method to find pending sync responses
responseSchema.statics.findPendingSync = function() {
  return this.find({
    'syncStatus.isSynced': false,
    'syncStatus.syncAttempts': { $lt: 3 }, // Max 3 retry attempts
    status: { $ne: 'synced' }
  });
};

// Static method to get form analytics
responseSchema.statics.getFormAnalytics = function(formId, startDate, endDate) {
  const matchStage = { formId: new mongoose.Types.ObjectId(formId) };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: 1 },
        successfulSubmissions: {
          $sum: { $cond: [{ $eq: ['$status', 'synced'] }, 1, 0] }
        },
        averageCompletionTime: {
          $avg: '$metadata.timeToComplete'
        },
        responsesByDay: {
          $push: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
responseSchema.pre('save', function(next) {
  // Calculate completion percentage if not set
  if (!this.metadata.completionPercentage) {
    const totalFields = this.responses.length;
    const completedFields = this.responses.filter(r => 
      r.value && r.value !== '' && r.value !== null
    ).length;
    
    this.metadata.completionPercentage = totalFields > 0 
      ? Math.round((completedFields / totalFields) * 100) 
      : 0;
  }
  
  next();
});

const Response = mongoose.model('Response', responseSchema);

module.exports = Response;