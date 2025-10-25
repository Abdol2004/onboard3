// routes/authRoutes.js - WITH EMAIL VERIFICATION ROUTES

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Registration & Login
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Email Verification
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

// Current User
router.get("/current-user", authController.getCurrentUser);

module.exports = router;