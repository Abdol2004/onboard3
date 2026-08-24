const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    enum: ['twitter_follow_check', 'twitter_user_lookup', 'twitter_oauth']
  },
  endpoint: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    default: null
  },
  statusCode: {
    type: Number,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  responseTime: {
    type: Number, // milliseconds
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // Auto-delete after 30 days
  }
});

// Indexes for efficient querying
apiUsageSchema.index({ service: 1, createdAt: -1 });
apiUsageSchema.index({ userId: 1, createdAt: -1 });
apiUsageSchema.index({ createdAt: -1 });

// Static method to get stats
apiUsageSchema.statics.getUsageStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$service',
        totalCalls: { $sum: 1 },
        successfulCalls: {
          $sum: { $cond: ['$success', 1, 0] }
        },
        failedCalls: {
          $sum: { $cond: ['$success', 0, 1] }
        },
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);

  // Get total across all services
  const total = await this.countDocuments({
    createdAt: { $gte: startDate }
  });

  return {
    stats,
    total,
    period: days
  };
};

// Static method to get today's usage
apiUsageSchema.statics.getTodayUsage = async function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const total = await this.countDocuments({
    createdAt: { $gte: startOfDay }
  });

  const byService = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay }
      }
    },
    {
      $group: {
        _id: '$service',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    total,
    byService: byService.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('ApiUsage', apiUsageSchema);
