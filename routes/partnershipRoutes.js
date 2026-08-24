const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Partner = require("../models/Partner");
const PartnerInquiry = require("../models/PartnerInquiry");

// ── Public inquiry (no auth required) ───────────────────────────────────────
router.post("/public-inquiry", async (req, res) => {
  try {
    const { projectName, email, website, telegram, partnershipType, description, budget, timeline } = req.body;
    if (!projectName || !email || !partnershipType || !description) {
      return res.json({ success: false, message: "Please fill in all required fields." });
    }
    const inquiry = new PartnerInquiry({ projectName, email, website, telegram, partnershipType, description, budget, timeline });
    await inquiry.save();
    res.json({ success: true, message: "Inquiry received! We'll be in touch within 48 hours." });
  } catch (err) {
    console.error("Partner inquiry error:", err);
    res.json({ success: false, message: "Server error. Please try again." });
  }
});
const { ROLES } = require("../config/gamification");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

// Open to all authenticated users — no XP gate
const isContributorOrAbove = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect('/auth');
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in partnership middleware:', error);
    res.redirect('/dashboard');
  }
};

// Partnership Page
router.get("/", isAuthenticated, isContributorOrAbove, async (req, res) => {
  try {
    const user = req.user;
    res.render("dashboard/partnership", {
      title: "Partner with ONBOARD3",
      user
    });
  } catch (error) {
    console.error("Error loading partnership page:", error);
    res.redirect("/dashboard");
  }
});

// Apply to become a Business Developer Partner
router.post("/apply", isAuthenticated, isContributorOrAbove, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    // Check if user has telegram connected
    if (!user.telegramConnected) {
      return res.json({
        success: false,
        message: "You must connect your Telegram account first"
      });
    }

    // Check if already applied
    const existingPartner = await Partner.findOne({ userId });
    if (existingPartner) {
      if (existingPartner.applicationStatus === 'rejected') {
        // Check if 30 days have passed since rejection
        const daysSinceRejection = (Date.now() - existingPartner.rejectedAt) / (1000 * 60 * 60 * 24);
        if (daysSinceRejection < 30) {
          return res.json({
            success: false,
            message: `You can reapply in ${Math.ceil(30 - daysSinceRejection)} days`
          });
        }
        // Allow reapplication by updating existing record
        existingPartner.applicationStatus = 'pending';
        existingPartner.appliedAt = new Date();
        existingPartner.fullName = req.body.fullName;
        existingPartner.telegramUsername = req.body.telegramUsername;
        existingPartner.phone = req.body.phone;
        existingPartner.country = req.body.country;
        existingPartner.experience = req.body.experience;
        existingPartner.previousPartnerships = req.body.previousPartnerships;
        existingPartner.motivation = req.body.motivation;
        existingPartner.rejectedAt = undefined;
        existingPartner.rejectionReason = undefined;
        await existingPartner.save();

        return res.json({
          success: true,
          message: "Application resubmitted successfully"
        });
      }
      return res.json({
        success: false,
        message: "You have already applied"
      });
    }

    const { fullName, telegramUsername, phone, country, experience, previousPartnerships, motivation } = req.body;

    // Validate required fields
    if (!fullName || !telegramUsername || !motivation) {
      return res.json({
        success: false,
        message: "Please fill in all required fields"
      });
    }

    // Create partner application
    const partner = new Partner({
      userId,
      fullName,
      telegramUsername,
      phone,
      country,
      experience: experience || 'beginner',
      previousPartnerships,
      motivation,
      applicationStatus: 'pending',
      appliedAt: new Date()
    });

    await partner.save();

    res.json({
      success: true,
      message: "Application submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting partner application:", error);
    res.json({
      success: false,
      message: "Error submitting application"
    });
  }
});

// Submit Project Proposal (Approved Partners only)
router.post("/proposal", isAuthenticated, isContributorOrAbove, async (req, res) => {
  try {
    const userId = req.session.userId;

    const partner = await Partner.findOne({ userId, applicationStatus: 'approved' });
    if (!partner) {
      return res.json({
        success: false,
        message: "You must be an approved Business Developer to submit proposals"
      });
    }

    const { projectName, projectDescription, projectWebsite, projectTwitter, projectType, estimatedBudget, additionalNotes } = req.body;

    // Validate required fields
    if (!projectName || !projectDescription || !projectType) {
      return res.json({
        success: false,
        message: "Please fill in all required fields"
      });
    }

    // Add proposal
    partner.proposals.push({
      projectName,
      projectDescription,
      projectWebsite,
      projectTwitter,
      projectType,
      estimatedBudget,
      additionalNotes,
      status: 'pending',
      submittedAt: new Date()
    });

    partner.totalProposals = (partner.totalProposals || 0) + 1;
    await partner.save();

    res.json({
      success: true,
      message: "Proposal submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting proposal:", error);
    res.json({
      success: false,
      message: "Error submitting proposal"
    });
  }
});

module.exports = router;
