const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['virtual', 'physical', 'hybrid'],
    required: true
  },
  category: {
    type: String,
    enum: ['hackathon', 'workshop', 'meetup', 'conference', 'exhibition', 'other'],
    default: 'other'
  },
  venue: {
    type: String,
    required: function() {
      return this.eventType === 'physical' || this.eventType === 'hybrid';
    }
  },
  virtualLink: {
    type: String,
    required: function() {
      return this.eventType === 'virtual' || this.eventType === 'hybrid';
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
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
    }
  }],
  totalRegistrations: {
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update totalRegistrations before saving
eventSchema.pre('save', function(next) {
  this.totalRegistrations = this.registrations.length;
  this.updatedAt = Date.now();
  next();
});

// Method to check if event is past
eventSchema.methods.isPastEvent = function() {
  return new Date() > this.endDate;
};

// Method to check if user is registered
eventSchema.methods.isUserRegistered = function(userId) {
  return this.registrations.some(reg => reg.user.toString() === userId.toString());
};

// Method to get checked-in count
eventSchema.methods.getCheckedInCount = function() {
  return this.registrations.filter(reg => reg.checkedIn).length;
};

module.exports = mongoose.model("Event", eventSchema);