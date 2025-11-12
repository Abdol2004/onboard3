// controllers/adminController.js
const User = require("../models/User");
const Quest = require("../models/Quest");
const Event = require("../models/Event");
const CourseApplication = require("../models/CourseApplication");
const UserQuestProgress = require("../models/UserQuestProgress");

// ==================== DASHBOARD ====================

// Get Admin Dashboard Page
exports.getAdminDashboard = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.redirect('/dashboard');
    }

    res.render('admin/dashboard', { 
      title: 'Admin Dashboard',
      user: user.toObject()
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).send("Error loading admin dashboard");
  }
};

// ==================== STATISTICS ====================

// Get Overall Statistics
exports.getStatistics = async (req, res) => {
  try {
    console.log('📊 Fetching statistics...');

    const totalUsers = await User.countDocuments();
    const activeQuests = await Quest.countDocuments({ isActive: true });
    const now = new Date();
    const upcomingEvents = await Event.countDocuments({
      startDate: { $gte: now },
      status: { $in: ['upcoming', 'ongoing'] }
    });
    const pendingApplications = await CourseApplication.countDocuments({ status: 'pending' });

    // Calculate total XP and USDC distributed
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalXP: { $sum: '$xp' },
          totalUSDC: { $sum: '$usdcBalance' }
        }
      }
    ]);

    const stats = {
      totalUsers,
      activeQuests,
      upcomingEvents,
      pendingApplications,
      totalXP: userStats[0]?.totalXP || 0,
      totalUSDC: userStats[0]?.totalUSDC || 0
    };

    console.log('✅ Statistics:', stats);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("❌ Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};

// ==================== USERS MANAGEMENT ====================

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    console.log('👥 Fetching users...');
    
    const { search, status, page = 1, limit = 50 } = req.query;

    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'unverified') {
      query.isVerified = false;
    }

    const users = await User.find(query)
      .select('-password -verificationToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users`);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};

// Get User Count
exports.getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    console.log(`👥 Total users: ${count}`);
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error("❌ Get user count error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user count",
      error: error.message
    });
  }
};

// Get Single User Details
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user's quest progress
    const questProgress = await UserQuestProgress.find({ userId })
      .populate('questId', 'title xpReward')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's event registrations
    const events = await Event.find({ 'registrations.user': userId })
      .select('title startDate eventType')
      .sort({ startDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      user,
      questProgress,
      events
    });

  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user details"
    });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { xp, usdcBalance, profession, isVerified } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update allowed fields
    if (xp !== undefined) user.xp = xp;
    if (usdcBalance !== undefined) user.usdcBalance = usdcBalance;
    if (profession !== undefined) user.profession = profession;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user
    });

  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user"
    });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Clean up user's data
    await UserQuestProgress.deleteMany({ userId });
    await Event.updateMany(
      { 'registrations.user': userId },
      { $pull: { registrations: { user: userId } } }
    );

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user"
    });
  }
};

// Export Users CSV
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('username email xp usdcBalance createdAt isVerified')
      .sort({ createdAt: -1 });

    // Create CSV
    let csv = 'Username,Email,XP,USDC Balance,Verified,Join Date\n';
    users.forEach(user => {
      csv += `${user.username},${user.email},${user.xp},${user.usdcBalance},${user.isVerified ? 'Yes' : 'No'},${new Date(user.createdAt).toLocaleDateString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);

  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting users"
    });
  }
};

// ==================== QUESTS MANAGEMENT ====================

// Get All Quests (Admin)
exports.getAllQuests = async (req, res) => {
  try {
    console.log('🎯 Fetching quests...');
    
    const { search, status, category } = req.query;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (category) {
      query.category = category;
    }

    const quests = await Quest.find(query)
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${quests.length} quests`);

    res.status(200).json({
      success: true,
      quests
    });

  } catch (error) {
    console.error("❌ Get quests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quests",
      error: error.message
    });
  }
};

// Get Quest Statistics
exports.getQuestStats = async (req, res) => {
  try {
    const active = await Quest.countDocuments({ isActive: true });
    const inactive = await Quest.countDocuments({ isActive: false });
    const total = await Quest.countDocuments();

    console.log(`🎯 Quest stats - Active: ${active}, Inactive: ${inactive}`);

    res.status(200).json({
      success: true,
      active,
      inactive,
      total
    });

  } catch (error) {
    console.error("❌ Get quest stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quest statistics",
      error: error.message
    });
  }
};
exports.createQuest = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      difficulty,
      questType,
      xpReward,
      usdcReward,
      badgeReward,
      estimatedDuration,
      tasks,
      resources
    } = req.body;

    console.log('🎯 Creating quest with data:', req.body);

    // Validation
    if (!title || !description || !shortDescription) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and short description are required"
      });
    }

const formattedTasks = Array.isArray(tasks)
  ? tasks.map((task, index) => {
      // If task is simple string
      if (typeof task === "string") {
        return {
          title: task,
          description: task, // ✅ Must be non-empty because schema requires it
          order: index + 1,
          taskType: "submission",
          inputLabel: null,
          inputName: null,
          buttonText: null,
          buttonLink: null,
          requirements: {},
          validationUrl: null
        };
      }

      // If task is object
      return {
        title: task.title || task.description || `Task ${index + 1}`,
        description: task.description || task.title || "",
        order: index + 1,
        taskType: task.taskType || "submission",

        inputLabel: task.inputLabel || null,
        inputName: task.inputName || null,
        buttonText: task.buttonText || null,
        buttonLink: task.buttonLink || null,

        requirements: task.requirements || {},
        validationUrl: task.validationUrl || null
      };
    })
  : [];console.log('📋 Formatted tasks:', formattedTasks);

    const quest = new Quest({
      title,
      description,
      shortDescription,
      category: category || 'learning',
      difficulty: difficulty || 'beginner',
      questType: questType || 'permanent',
      xpReward: xpReward || 100,
      usdcReward: usdcReward || 0,
      badgeReward: badgeReward || null,
      estimatedDuration: estimatedDuration || "1-2 hours",
      tasks: formattedTasks,
      resources: resources || [],
      createdBy: req.session.userId,
      isActive: true
    });

    await quest.save();

    console.log('✅ Quest created successfully:', quest._id);

    res.status(201).json({
      success: true,
      message: "Quest created successfully",
      quest
    });

  } catch (error) {
    console.error("❌ Create quest error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating quest",
      error: error.message
    });
  }
};

// Update Quest
exports.updateQuest = async (req, res) => {
  try {
    const { questId } = req.params;
    const updateData = req.body;

    const quest = await Quest.findByIdAndUpdate(
      questId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Quest updated successfully",
      quest
    });

  } catch (error) {
    console.error("Update quest error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quest"
    });
  }
};

// Toggle Quest Status
exports.toggleQuestStatus = async (req, res) => {
  try {
    const { questId } = req.params;
    const { isActive } = req.body;

    const quest = await Quest.findById(questId);

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    quest.isActive = isActive;
    quest.updatedAt = Date.now();
    await quest.save();

    res.status(200).json({
      success: true,
      message: `Quest ${isActive ? 'activated' : 'deactivated'} successfully`,
      quest
    });

  } catch (error) {
    console.error("Toggle quest status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quest status"
    });
  }
};

// Delete Quest
exports.deleteQuest = async (req, res) => {
  try {
    const { questId } = req.params;

    const quest = await Quest.findByIdAndDelete(questId);

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found"
      });
    }

    // Delete associated progress records
    await UserQuestProgress.deleteMany({ questId });

    res.status(200).json({
      success: true,
      message: "Quest deleted successfully"
    });

  } catch (error) {
    console.error("Delete quest error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting quest"
    });
  }
};

// ==================== EVENTS MANAGEMENT ====================

// Get Event Statistics
exports.getEventStats = async (req, res) => {
  try {
    const now = new Date();
    
    const upcoming = await Event.countDocuments({
      startDate: { $gte: now }
    });

    const completed = await Event.countDocuments({ 
      endDate: { $lt: now }
    });
    
    const total = await Event.countDocuments();

    console.log(`📅 Event stats - Upcoming: ${upcoming}, Completed: ${completed}`);

    res.status(200).json({
      success: true,
      upcoming,
      completed,
      total
    });

  } catch (error) {
    console.error("❌ Get event stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event statistics",
      error: error.message
    });
  }
};
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      category,
      venue,
      virtualLink,
      startDate,
      endDate,
      startTime,
      endTime,
      timezone,
      prizePool,
      maxRegistrations
    } = req.body;

    console.log('📅 Creating event with data:', req.body);

    // Validation
    if (!title || !description || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing: title, description, eventType, startDate, endDate"
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Validate venue/virtualLink based on eventType
    if (eventType === 'physical' || eventType === 'hybrid') {
      if (!venue || venue.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Venue is required for physical and hybrid events"
        });
      }
    }

    if (eventType === 'virtual' || eventType === 'hybrid') {
      if (!virtualLink || virtualLink.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Virtual link is required for virtual and hybrid events"
        });
      }
    }

    // Create event object with proper null handling
    const eventData = {
      title,
      description,
      eventType,
      category: category || 'other',
      startDate: start,
      endDate: end,
      startTime: startTime || '10:00',
      endTime: endTime || '17:00',
      timezone: timezone || 'WAT',
      prizePool: prizePool || null,
      maxRegistrations: maxRegistrations || null,
      status: 'upcoming',
      createdBy: req.session.userId
    };

    // Only add venue if it's physical or hybrid
    if (eventType === 'physical' || eventType === 'hybrid') {
      eventData.venue = venue;
    }

    // Only add virtualLink if it's virtual or hybrid
    if (eventType === 'virtual' || eventType === 'hybrid') {
      eventData.virtualLink = virtualLink;
    }

    const event = new Event(eventData);

    await event.save();

    console.log('✅ Event created successfully:', event._id);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event
    });

  } catch (error) {
    console.error("❌ Create event error:", error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error: " + messages.join(', '),
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message,
      details: error.stack
    });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating event"
    });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting event"
    });
  }
};

// Get Event Registrations
exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('registrations.user', 'username email xp');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.status(200).json({
      success: true,
      registrations: event.registrations,
      total: event.totalRegistrations,
      checkedIn: event.registrations.filter(r => r.checkedIn).length
    });

  } catch (error) {
    console.error("Get registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations"
    });
  }
};

// ==================== APPLICATIONS MANAGEMENT ====================

// Get All Applications (Admin)
exports.getAllApplications = async (req, res) => {
  try {
    console.log('📝 Fetching applications...');
    
    const { status, course, search } = req.query;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (course) {
      query.course = course;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const applications = await CourseApplication.find(query)
      .populate('user', 'username email')
      .sort({ appliedAt: -1 });

    console.log(`✅ Found ${applications.length} applications`);

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error("❌ Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message
    });
  }
};

// Get Application Statistics
exports.getApplicationStats = async (req, res) => {
  try {
    const pending = await CourseApplication.countDocuments({ status: 'pending' });
    const approved = await CourseApplication.countDocuments({ status: 'approved' });
    const rejected = await CourseApplication.countDocuments({ status: 'rejected' });
    const total = await CourseApplication.countDocuments();

    console.log(`📝 Application stats - Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);

    res.status(200).json({
      success: true,
      pending,
      approved,
      rejected,
      total
    });

  } catch (error) {
    console.error("❌ Get application stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application statistics",
      error: error.message
    });
  }
};

// Approve Application (Admin)
exports.approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { courseStartDate, courseEndDate, courseLink, notes } = req.body;

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    await application.approve(req.session.userId, notes, {
      startDate: courseStartDate,
      endDate: courseEndDate,
      link: courseLink
    });

    res.status(200).json({
      success: true,
      message: "Application approved successfully",
      application
    });

  } catch (error) {
    console.error("Approve application error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving application"
    });
  }
};

// Reject Application (Admin)
exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { notes } = req.body;

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    await application.reject(req.session.userId, notes);

    res.status(200).json({
      success: true,
      message: "Application rejected",
      application
    });

  } catch (error) {
    console.error("Reject application error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting application"
    });
  }
};

// Export Applications CSV
exports.exportApplications = async (req, res) => {
  try {
    const applications = await CourseApplication.find()
      .sort({ appliedAt: -1 });

    // Create CSV
    let csv = 'Name,Email,Course,Twitter,Status,Applied Date\n';
    applications.forEach(app => {
      csv += `${app.fullName},${app.email},${app.course},${app.twitterHandle || 'N/A'},${app.status},${new Date(app.appliedAt).toLocaleDateString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.send(csv);

  } catch (error) {
    console.error("Export applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting applications"
    });
  }
};