const CourseApplication = require("../models/CourseApplication");
const User = require("../models/User");
const { sendCourseApplicationEmail, sendCourseApprovalEmail, sendCourseRejectionEmail } = require("../utils/emailService");

// Submit course application
exports.submitApplication = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { course, fullName, email, twitterHandle, motivation, experience } = req.body;

    // Validation
    if (!course || !fullName || !email || !motivation) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    // Get user details
    const user = await User.findById(userId);

    // Check if user already applied for this course
    const existingApplication = await CourseApplication.findOne({
      user: userId,
      course: course,
      status: { $in: ['pending', 'approved', 'waitlisted'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingApplication.status} application for this course`
      });
    }

    // Create new application
    const application = new CourseApplication({
      user: userId,
      username: user.username,
      email: email,
      course,
      fullName,
      twitterHandle: twitterHandle || null,
      motivation,
      experience: experience || null,
      status: 'pending'
    });

    await application.save();

    // Send confirmation email
    try {
      await sendCourseApplicationEmail(email, fullName, course);
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! You'll receive a response within 3-5 business days.",
      application
    });

  } catch (error) {
    console.error("Submit application error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting application"
    });
  }
};

// Get user's applications
exports.getUserApplications = async (req, res) => {
  try {
    const userId = req.session.userId;

    const applications = await CourseApplication.find({ user: userId })
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications"
    });
  }
};

// Get single application
exports.getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.session.userId;

    const application = await CourseApplication.findOne({
      _id: applicationId,
      user: userId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.status(200).json({
      success: true,
      application
    });

  } catch (error) {
    console.error("Get application error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching application"
    });
  }
};

// Cancel/Withdraw application (only if pending)
exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.session.userId;

    const application = await CourseApplication.findOne({
      _id: applicationId,
      user: userId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    if (!application.isPending()) {
      return res.status(400).json({
        success: false,
        message: "Can only cancel pending applications"
      });
    }

    await CourseApplication.findByIdAndDelete(applicationId);

    res.status(200).json({
      success: true,
      message: "Application cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel application error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling application"
    });
  }
};

// Get all available courses
exports.getAvailableCourses = async (req, res) => {
  try {
    const courses = [
      {
        id: 'content-creation',
        name: 'Content Creation',
        description: 'Learn to create engaging Web3 content, write technical articles, and build your personal brand',
        duration: '6 weeks',
        level: 'Beginner to Intermediate',
        skills: ['Content Writing', 'Social Media', 'Technical Writing', 'Storytelling'],
        icon: 'fa-pen-nib'
      },
      {
        id: 'community-management',
        name: 'Community Management',
        description: 'Master the art of building and managing thriving Web3 communities',
        duration: '8 weeks',
        level: 'Beginner to Intermediate',
        skills: ['Discord Management', 'Community Building', 'Engagement Strategies', 'Moderation'],
        icon: 'fa-users'
      },
      {
        id: 'smart-contract-development',
        name: 'Smart Contract Development',
        description: 'Build secure and efficient smart contracts with Solidity',
        duration: '12 weeks',
        level: 'Intermediate to Advanced',
        skills: ['Solidity', 'Hardhat', 'Testing', 'Security Auditing'],
        icon: 'fa-code'
      },
      {
        id: 'frontend-development',
        name: 'Frontend Development',
        description: 'Create beautiful and functional Web3 frontends with React and Web3.js',
        duration: '10 weeks',
        level: 'Intermediate',
        skills: ['React', 'Web3.js', 'Ethers.js', 'Wallet Integration'],
        icon: 'fa-laptop-code'
      },
      {
        id: 'marketing-growth',
        name: 'Marketing & Growth',
        description: 'Drive growth and engagement for Web3 projects',
        duration: '6 weeks',
        level: 'Beginner to Intermediate',
        skills: ['Growth Hacking', 'Marketing Strategy', 'Analytics', 'Campaign Management'],
        icon: 'fa-chart-line'
      },
      {
        id: 'product-design',
        name: 'Product Design',
        description: 'Design user-friendly Web3 products and experiences',
        duration: '8 weeks',
        level: 'Beginner to Intermediate',
        skills: ['UI/UX Design', 'Figma', 'User Research', 'Prototyping'],
        icon: 'fa-paint-brush'
      }
    ];

    res.status(200).json({
      success: true,
      courses
    });

  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses"
    });
  }
};

// Admin: Get all applications (with filters)
exports.getAllApplications = async (req, res) => {
  try {
    const { status, course } = req.query;

    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (course) {
      query.course = course;
    }

    const applications = await CourseApplication.find(query)
      .populate('user', 'username email')
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      applications,
      total: applications.length
    });

  } catch (error) {
    console.error("Get all applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications"
    });
  }
};

// Admin: Approve application
exports.approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.session.userId;
    const { notes, courseStartDate, courseEndDate, courseLink } = req.body;

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Approve application
    await application.approve(adminId, notes, {
      startDate: courseStartDate,
      endDate: courseEndDate,
      link: courseLink
    });

    // Send approval email
    try {
      await sendCourseApprovalEmail(
        application.email,
        application.fullName,
        application.course,
        {
          startDate: courseStartDate,
          endDate: courseEndDate,
          link: courseLink
        }
      );
    } catch (emailError) {
      console.error("Approval email error:", emailError);
    }

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

// Admin: Reject application
exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.session.userId;
    const { notes } = req.body;

    const application = await CourseApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Reject application
    await application.reject(adminId, notes);

    // Send rejection email
    try {
      await sendCourseRejectionEmail(
        application.email,
        application.fullName,
        application.course,
        notes
      );
    } catch (emailError) {
      console.error("Rejection email error:", emailError);
    }

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

// Admin: Get application statistics
exports.getApplicationStats = async (req, res) => {
  try {
    const totalApplications = await CourseApplication.countDocuments();
    const pendingApplications = await CourseApplication.countDocuments({ status: 'pending' });
    const approvedApplications = await CourseApplication.countDocuments({ status: 'approved' });
    const rejectedApplications = await CourseApplication.countDocuments({ status: 'rejected' });

    // Applications by course
    const applicationsByCourse = await CourseApplication.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Recent applications
    const recentApplications = await CourseApplication.find()
      .sort({ appliedAt: -1 })
      .limit(10)
      .populate('user', 'username email');

    res.status(200).json({
      success: true,
      stats: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        byCourse: applicationsByCourse,
        recent: recentApplications
      }
    });

  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics"
    });
  }
};