// models/Event.js - FIXED VERSION
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  eventType: {
    type: String,
    enum: ['virtual', 'physical', 'hybrid'],
    required: [true, 'Event type is required']
  },
  category: {
    type: String,
    enum: ['hackathon', 'workshop', 'meetup', 'conference', 'exhibition', 'other'],
    default: 'other'
  },
  venue: {
    type: String,
    // Only validate if eventType is physical or hybrid
    validate: {
      validator: function(value) {
        // If it's virtual, venue is optional
        if (this.eventType === 'virtual') {
          return true;
        }
        // For physical and hybrid, venue is required
        if (this.eventType === 'physical' || this.eventType === 'hybrid') {
          return !!value && value.trim().length > 0;
        }
        return true;
      },
      message: 'Venue is required for physical and hybrid events'
    }
  },
  virtualLink: {
    type: String,
    // Only validate if eventType is virtual or hybrid
    validate: {
      validator: function(value) {
        // If it's physical, virtualLink is optional
        if (this.eventType === 'physical') {
          return true;
        }
        // For virtual and hybrid, virtualLink is required
        if (this.eventType === 'virtual' || this.eventType === 'hybrid') {
          return !!value && value.trim().length > 0;
        }
        return true;
      },
      message: 'Virtual link is required for virtual and hybrid events'
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    default: '10:00'
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    default: '17:00'
  },
  timezone: {
    type: String,
    default: 'WAT'
  },
  bannerImage: {
    type: String,
    default: null
  },
  prizePool: {
    type: String,
    default: null
  },
  // Approval settings
  approvalType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },

  // Google Maps location for IRL events
  googleMapsUrl: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  },

  // Max attendees
  maxAttendees: {
    type: Number,
    default: null // null = unlimited
  },

  registrations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    email: String,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isWalkIn: {
      type: Boolean,
      default: false
    }
  }],
  totalRegistrations: {
    type: Number,
    default: 0
  },
  totalApproved: {
    type: Number,
    default: 0
  },
  totalCheckedIn: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  tags: [{
    type: String
  }],
  organizer: {
    type: String,
    default: 'ONBOARD3'
  },
  whatsappGroup: {
    type: String,
    default: null
  },
  requirements: [{
    type: String
  }],
  agenda: [{
    time: String,
    activity: String
  }],
  speakers: [{
    name: String,
    title: String,
    bio: String,
    image: String
  }],
}, {
  timestamps: true // This will auto-manage createdAt and updatedAt
});

// Update counts before saving
eventSchema.pre('save', function(next) {
  this.totalRegistrations = this.registrations.length;
  this.totalApproved = this.registrations.filter(r => r.status === 'approved').length;
  this.totalCheckedIn = this.registrations.filter(r => r.checkedIn).length;

  // Auto-approve if approvalType is auto
  if (this.approvalType === 'auto') {
    this.registrations.forEach(reg => {
      if (reg.status === 'pending') {
        reg.status = 'approved';
        reg.approvedAt = new Date();
      }
    });
  }

  next();
});

// Method to check if event is past
eventSchema.methods.isPastEvent = function() {
  return new Date() > this.endDate;
};

// Method to check if user is registered
eventSchema.methods.isUserRegistered = function(userId) {
  if (!userId) return false;
  return this.registrations.some(reg => reg.user.toString() === userId.toString());
};

// Method to get checked-in count
eventSchema.methods.getCheckedInCount = function() {
  return this.registrations.filter(reg => reg.checkedIn).length;
};

// Get user registration
eventSchema.methods.getUserRegistration = function(userId) {
  return this.registrations.find(r => r.user.toString() === userId.toString());
};

// Check if event is live (happening now)
eventSchema.methods.isLive = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
};

// Check if registration is open
eventSchema.methods.isRegistrationOpen = function() {
  if (this.status === 'cancelled') return false;
  if (this.isPastEvent()) return false;
  if (this.maxAttendees && this.totalApproved >= this.maxAttendees) return false;
  return true;
};

module.exports = mongoose.model("Event", eventSchema);