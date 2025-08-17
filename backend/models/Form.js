const mongoose = require('mongoose');

// Schema for conditional logic rules
const conditionalRuleSchema = new mongoose.Schema({
  fieldId: { type: String, required: true }, // Field to check
  operator: { 
    type: String, 
    required: true,
    enum: ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty']
  },
  value: mongoose.Schema.Types.Mixed // Value to compare against
}, { _id: false });

// Schema for form fields/questions
const formFieldSchema = new mongoose.Schema({
  // Airtable field info
  airtableFieldId: { type: String, required: true },
  airtableFieldName: { type: String, required: true },
  airtableFieldType: { 
    type: String, 
    required: true,
    enum: ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelect', 'attachment']
  },
  
  // Form-specific settings
  label: { type: String, required: true }, // Custom label for the form
  placeholder: String,
  description: String,
  required: { type: Boolean, default: false },
  
  // Field options (for select fields)
  options: [{
    id: String,
    name: String,
    color: String
  }],
  
  // Conditional logic
  showWhen: [conditionalRuleSchema],
  
  // Display settings
  order: { type: Number, required: true },
  isVisible: { type: Boolean, default: true }
}, { _id: false });

// Main form schema
const formSchema = new mongoose.Schema({
  // Form metadata
  title: { type: String, required: true },
  description: String,
  
  // Owner
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Airtable connection
  airtableBaseId: { type: String, required: true },
  airtableBaseName: { type: String, required: true },
  airtableTableId: { type: String, required: true },
  airtableTableName: { type: String, required: true },
  
  // Form configuration
  fields: [formFieldSchema],
  
  // Form settings
  settings: {
    allowMultipleSubmissions: { type: Boolean, default: true },
    requireLogin: { type: Boolean, default: false },
    showProgressBar: { type: Boolean, default: true },
    submitButtonText: { type: String, default: 'Submit' },
    successMessage: { type: String, default: 'Thank you for your submission!' },
    redirectUrl: String
  },
  
  // Form status
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  
  // Statistics
  stats: {
    totalViews: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  
  // Sharing settings
  shareSettings: {
    isPublic: { type: Boolean, default: true },
    shareUrl: String,
    embedCode: String
  }
}, {
  timestamps: true
});

// Indexes for performance
formSchema.index({ userId: 1, createdAt: -1 });
formSchema.index({ isActive: 1, isPublished: 1 });
formSchema.index({ 'shareSettings.shareUrl': 1 });
formSchema.index({ airtableBaseId: 1, airtableTableId: 1 });

// Virtual for form URL
formSchema.virtual('url').get(function() {
  return `/form/${this._id}`;
});

// Pre-save middleware to generate share URL
formSchema.pre('save', function(next) {
  if (this.isNew || !this.shareSettings.shareUrl) {
    this.shareSettings.shareUrl = this._id.toString();
    this.shareSettings.embedCode = `<iframe src="${process.env.CLIENT_URL}/embed/${this._id}" width="100%" height="600" frameborder="0"></iframe>`;
  }
  
  // Calculate conversion rate
  if (this.stats.totalViews > 0) {
    this.stats.conversionRate = Math.round((this.stats.totalSubmissions / this.stats.totalViews) * 100);
  }
  
  next();
});

// Instance method to increment views
formSchema.methods.incrementViews = function() {
  this.stats.totalViews += 1;
  return this.save();
};

// Instance method to increment submissions
formSchema.methods.incrementSubmissions = function() {
  this.stats.totalSubmissions += 1;
  return this.save();
};

// Static method to find published forms
formSchema.statics.findPublished = function() {
  return this.find({ isActive: true, isPublished: true });
};

// Static method to find by user with populated data
formSchema.statics.findByUserWithStats = function(userId) {
  return this.find({ userId })
    .select('title description isActive isPublished stats createdAt updatedAt')
    .sort({ updatedAt: -1 });
};

const Form = mongoose.model('Form', formSchema);

module.exports = Form;