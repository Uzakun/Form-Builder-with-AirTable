const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic user info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Airtable OAuth data
  airtableUserId: {
    type: String,
    required: true,
    unique: true
  },
  
  airtableAccessToken: {
    type: String,
    required: true
  },
  
  airtableRefreshToken: {
    type: String
  },
  
  airtableTokenExpiresAt: {
    type: Date
  },
  
  // User profile from Airtable
  profile: {
    name: String,
    avatarUrl: String,
    airtableUsername: String
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ airtableUserId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Instance method to check if token is expired
userSchema.methods.isTokenExpired = function() {
  if (!this.airtableTokenExpiresAt) return false;
  return new Date() > this.airtableTokenExpiresAt;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find by Airtable user ID
userSchema.statics.findByAirtableUserId = function(airtableUserId) {
  return this.findOne({ airtableUserId });
};

// Pre-save middleware to hash sensitive data if needed
userSchema.pre('save', function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  next();
});

// Transform output to remove sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields from the output
  delete userObject.airtableAccessToken;
  delete userObject.airtableRefreshToken;
  
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;