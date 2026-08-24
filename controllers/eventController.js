const Event = require("../models/Event");
const User = require("../models/User");
const emailService = require("../utils/emailService");

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
    console.log("User ID:", userId);

    // First, fetch event WITHOUT populating to check registration status
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if user is registered BEFORE populating
    const isRegistered = event.isUserRegistered(userId);
    const isPast = event.isPastEvent();
    const checkedInCount = event.getCheckedInCount();

    // Get user's registration details BEFORE populating
    let userRegistration = null;
    if (userId && isRegistered) {
      userRegistration = event.getUserRegistration(userId);
      console.log("✅ Found user registration:", {
        status: userRegistration?.status,
        registeredAt: userRegistration?.registeredAt,
        userId: userRegistration?.user?.toString()
      });
    } else {
      console.log("❌ User not registered. IsRegistered:", isRegistered, "UserId:", userId);
    }

    // NOW populate for display purposes
    await event.populate('registrations.user', 'username email');
    await event.populate('registrations.checkedInBy', 'username');

    console.log("Event found:", event.title);
    console.log("Is Registered:", isRegistered);
    console.log("User Registration:", userRegistration ? `Status: ${userRegistration.status}` : 'Not found');

    res.status(200).json({
      success: true,
      event,
      isRegistered,
      isPast,
      checkedInCount,
      userRegistration: userRegistration ? {
        status: userRegistration.status,
        registeredAt: userRegistration.registeredAt,
        approvedAt: userRegistration.approvedAt,
        rejectionReason: userRegistration.rejectionReason
      } : null
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

    // Check if max attendees limit reached (for manual approval, check pending+approved)
    if (event.maxAttendees) {
      const currentCount = event.approvalType === 'manual'
        ? event.registrations.length
        : event.totalApproved;

      if (currentCount >= event.maxAttendees) {
        return res.status(400).json({
          success: false,
          message: "This event has reached maximum capacity"
        });
      }
    }

    // Get user details
    const user = await User.findById(userId);

    // Determine initial status based on approval type
    const initialStatus = event.approvalType === 'auto' ? 'approved' : 'pending';
    const approvedAt = event.approvalType === 'auto' ? new Date() : null;

    // Add registration
    event.registrations.push({
      user: userId,
      username: user.username,
      email: user.email,
      registeredAt: new Date(),
      status: initialStatus,
      approvedAt: approvedAt
    });

    await event.save();

    // Send appropriate email based on approval type
    try {
      if (event.approvalType === 'auto') {
        console.log("📧 Sending auto-approved registration email to:", user.email);
        const emailResult = await emailService.sendEventConfirmationEmail(user.email, user.username, event);

        if (emailResult.success) {
          console.log("✅ Auto-approval email sent successfully!");
        } else {
          console.error("❌ Failed to send auto-approval email:", emailResult.error);
        }
      } else {
        console.log("📧 Sending pending approval email to:", user.email);
        const emailResult = await emailService.sendEventPendingEmail(user.email, user.username, event);

        if (emailResult.success) {
          console.log("✅ Pending approval email sent successfully!");
        } else {
          console.error("❌ Failed to send pending email:", emailResult.error);
        }
      }
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
      // Continue even if email fails
    }

    const message = event.approvalType === 'auto'
      ? "Successfully registered for the event! Check your email for confirmation."
      : "Registration submitted! Your registration is pending approval. You'll receive an email once it's reviewed.";

    res.status(200).json({
      success: true,
      message,
      event,
      status: initialStatus
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

    // Check if registration is approved
    if (registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: "Cannot check in - registration not approved"
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

// ✅ ADDED: Admin function to send event reminders
exports.sendEventReminders = async (req, res) => {
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

    let successCount = 0;
    let failCount = 0;

    // Send reminder to all registered users
    for (const registration of event.registrations) {
      try {
        console.log("📧 Sending event reminder to:", registration.email);
        const emailResult = await emailService.sendEventReminderEmail(
          registration.email,
          registration.username,
          event
        );
        
        if (emailResult.success) {
          successCount++;
          console.log("✅ Event reminder sent to:", registration.email);
        } else {
          failCount++;
          console.error("❌ Failed to send reminder to:", registration.email);
        }
      } catch (emailError) {
        failCount++;
        console.error("❌ Error sending reminder to:", registration.email, emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Reminders sent! Success: ${successCount}, Failed: ${failCount}`,
      successCount,
      failCount
    });

  } catch (error) {
    console.error("Send reminders error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending event reminders"
    });
  }
};

// Admin: Approve registration
exports.approveRegistration = async (req, res) => {
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
        message: "Registration not found"
      });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Registration already approved"
      });
    }

    // Check max attendees limit
    if (event.maxAttendees && event.totalApproved >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: "Event has reached maximum capacity"
      });
    }

    // Update registration status
    registration.status = 'approved';
    registration.approvedAt = new Date();
    registration.approvedBy = adminId;

    await event.save();

    // Send approval email
    try {
      const user = await User.findById(userId);
      console.log("📧 Sending approval email to:", user.email);
      const emailResult = await emailService.sendEventApprovalEmail(user.email, user.username, event);

      if (emailResult.success) {
        console.log("✅ Approval email sent successfully!");
      } else {
        console.error("❌ Failed to send approval email:", emailResult.error);
      }
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Registration approved successfully",
      registration
    });

  } catch (error) {
    console.error("Approve registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving registration"
    });
  }
};

// Admin: Reject registration
exports.rejectRegistration = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const { reason } = req.body;

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
        message: "Registration not found"
      });
    }

    if (registration.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: "Registration already rejected"
      });
    }

    // Update registration status
    registration.status = 'rejected';
    registration.rejectionReason = reason || 'No reason provided';

    await event.save();

    // Send rejection email
    try {
      const user = await User.findById(userId);
      console.log("📧 Sending rejection email to:", user.email);
      const emailResult = await emailService.sendEventRejectionEmail(
        user.email,
        user.username,
        event,
        registration.rejectionReason
      );

      if (emailResult.success) {
        console.log("✅ Rejection email sent successfully!");
      } else {
        console.error("❌ Failed to send rejection email:", emailResult.error);
      }
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Registration rejected",
      registration
    });

  } catch (error) {
    console.error("Reject registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting registration"
    });
  }
};

// Admin: Add walk-in attendee
exports.addWalkIn = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, email, username } = req.body;
    const adminId = req.session.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if event is live or past
    if (!event.isLive() && !event.isPastEvent()) {
      return res.status(400).json({
        success: false,
        message: "Can only add walk-ins during or after the event"
      });
    }

    let walkInUser;

    // If userId provided, find the user
    if (userId) {
      walkInUser = await User.findById(userId);

      if (!walkInUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if already registered
      if (event.isUserRegistered(userId)) {
        return res.status(400).json({
          success: false,
          message: "User already registered for this event"
        });
      }
    } else if (email && username) {
      // Manual entry (no userId) - just use provided email/username
      walkInUser = { email, username };
    } else {
      return res.status(400).json({
        success: false,
        message: "Either userId or both email and username are required"
      });
    }

    // Check max attendees limit
    if (event.maxAttendees && event.totalApproved >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: "Event has reached maximum capacity"
      });
    }

    // Add walk-in registration (auto-approved and checked-in)
    const walkInRegistration = {
      user: userId || null,
      username: walkInUser.username,
      email: walkInUser.email,
      registeredAt: new Date(),
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
      isWalkIn: true,
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: adminId
    };

    event.registrations.push(walkInRegistration);
    await event.save();

    res.status(200).json({
      success: true,
      message: "Walk-in attendee added successfully",
      registration: walkInRegistration
    });

  } catch (error) {
    console.error("Add walk-in error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding walk-in attendee"
    });
  }
};