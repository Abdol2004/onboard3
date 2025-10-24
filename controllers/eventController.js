const Event = require("../models/Event");
const User = require("../models/User");
const { sendEventRegistrationEmail, sendEventReminderEmail } = require("../utils/emailService");

// Get all events (separated by active and past)
exports.getAllEvents = async (req, res) => {
  console.log("✅ /api/events route hit");
  try {
    const userId = req.session.userId;
    console.log("UserID:", userId);

    const now = new Date();

    // Get active events (upcoming and ongoing) - Check by endDate
    const activeEvents = await Event.find({
      endDate: { $gte: now },
      status: { $in: ['upcoming', 'ongoing'] }
    }).sort({ startDate: 1 });

    // Get past events - Check by endDate OR completed status
    const pastEvents = await Event.find({
      $or: [
        { endDate: { $lt: now } },
        { status: { $in: ['completed', 'cancelled'] } }
      ]
    }).sort({ startDate: -1 }).limit(10);

    // Get user's registered events
    let userRegisteredEvents = [];
    if (userId) {
      userRegisteredEvents = await Event.find({
        'registrations.user': userId
      }).sort({ startDate: 1 });
    }

    console.log("Events fetched:", {
      active: activeEvents.length,
      past: pastEvents.length,
      registered: userRegisteredEvents.length
    });

    res.json({
      success: true,
      activeEvents,
      pastEvents,
      userRegisteredEvents
    });

  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err.message 
    });
  }
};

// Get single event details
exports.getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.userId;

    console.log("Fetching event:", eventId);

    const event = await Event.findById(eventId)
      .populate('registrations.user', 'username email')
      .populate('registrations.checkedInBy', 'username');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if user is registered
    const isRegistered = event.isUserRegistered(userId);
    const isPast = event.isPastEvent();
    const checkedInCount = event.getCheckedInCount();

    console.log("Event found:", event.title);

    res.status(200).json({
      success: true,
      event,
      isRegistered,
      isPast,
      checkedInCount
    });

  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event details",
      error: error.message
    });
  }
};

// Register for an event
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if event is past
    if (event.isPastEvent()) {
      return res.status(400).json({
        success: false,
        message: "Cannot register for past events"
      });
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "This event has been cancelled"
      });
    }

    // Check if user is already registered
    if (event.isUserRegistered(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are already registered for this event"
      });
    }

    // Get user details
    const user = await User.findById(userId);

    // Add registration
    event.registrations.push({
      user: userId,
      username: user.username,
      email: user.email,
      registeredAt: new Date()
    });

    await event.save();

    // Send confirmation email
    try {
      await sendEventRegistrationEmail(user.email, user.username, event);
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: "Successfully registered for the event! Check your email for confirmation.",
      event
    });

  } catch (error) {
    console.error("Event registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering for event"
    });
  }
};

// Cancel event registration
exports.cancelRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if event is past
    if (event.isPastEvent()) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel registration for past events"
      });
    }

    // Check if user is registered
    if (!event.isUserRegistered(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are not registered for this event"
      });
    }

    // Remove registration
    event.registrations = event.registrations.filter(
      reg => reg.user.toString() !== userId.toString()
    );

    await event.save();

    res.status(200).json({
      success: true,
      message: "Registration cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling registration"
    });
  }
};

// Get user's registered events
exports.getUserRegisteredEvents = async (req, res) => {
  try {
    const userId = req.session.userId;

    const events = await Event.find({
      'registrations.user': userId
    }).sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      events
    });

  } catch (error) {
    console.error("Get user events error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching your registered events"
    });
  }
};

// Admin: Check-in attendee
exports.checkInAttendee = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const adminId = req.session.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const registration = event.registrations.find(
      reg => reg.user.toString() === userId
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "User not registered for this event"
      });
    }

    if (registration.checkedIn) {
      return res.status(400).json({
        success: false,
        message: "User already checked in"
      });
    }

    // Update check-in status
    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.checkedInBy = adminId;

    await event.save();

    res.status(200).json({
      success: true,
      message: "Attendee checked in successfully",
      registration
    });

  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking in attendee"
    });
  }
};

// Admin: Get event statistics
exports.getEventStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('registrations.user', 'username email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const stats = {
      totalRegistrations: event.totalRegistrations,
      checkedInCount: event.getCheckedInCount(),
      notCheckedInCount: event.totalRegistrations - event.getCheckedInCount(),
      registrationsByDay: {}
    };

    // Group registrations by day
    event.registrations.forEach(reg => {
      const day = reg.registeredAt.toISOString().split('T')[0];
      stats.registrationsByDay[day] = (stats.registrationsByDay[day] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      stats,
      event
    });

  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event statistics"
    });
  }
};