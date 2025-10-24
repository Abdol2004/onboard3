const mongoose = require("mongoose");

const courseApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true,
    enum: [
      'Content Creation',
      'Community Management',
      'Smart Contract Development',
      'Frontend Development',
      'Marketing & Growth',
      'Product Design'
    ]
  },
  fullName: {
    type: String,
    required: true
  },
  twitterHandle: {
    type: String,
    default: null
  },
  motivation: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'waitlisted'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: null
  },
  // Course details after approval
  courseStartDate: {
    type: Date,
    default: null
  },
  courseEndDate: {
    type: Date,
    default: null
  },
  courseLink: {
    type: String,
    default: null
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: {
    type: String,
    default: null
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
courseApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if application is still pending
courseApplicationSchema.methods.isPending = function() {
  return this.status === 'pending';
};

// Method to approve application
courseApplicationSchema.methods.approve = async function(reviewerId, notes, courseDetails) {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes || 'Application approved';
  
  if (courseDetails) {
    this.courseStartDate = courseDetails.startDate;
    this.courseEndDate = courseDetails.endDate;
    this.courseLink = courseDetails.link;
  }
  
  return await this.save();
};

// Method to reject application
courseApplicationSchema.methods.reject = async function(reviewerId, notes) {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes || 'Application rejected';
  
  return await this.save();
};

module.exports = mongoose.model("CourseApplication", courseApplicationSchema);