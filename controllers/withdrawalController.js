// controllers/withdrawalController.js
const User = require("../models/User");
const Transaction = require("../models/Transaction");

// ==================== USER WITHDRAWAL PAGE ====================

// Get Withdrawal Page
exports.getWithdrawalPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }

    // Get user's transaction history
    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get pending withdrawal (if any)
    const pendingWithdrawal = await Transaction.findOne({
      user: user._id,
      type: 'withdrawal',
      status: 'pending'
    });

    res.render('withdrawal', { 
      title: 'Withdrawals',
      user: user.toObject(),
      transactions,
      pendingWithdrawal
    });

  } catch (error) {
    console.error("Withdrawal page error:", error);
    res.status(500).send("Error loading withdrawal page");
  }
};

// Request Withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Validate wallet address
    if (!user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Please set up your wallet address in Settings first"
      });
    }

    // Validate amount
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount"
      });
    }

    // Check minimum withdrawal (e.g., $5)
    if (withdrawAmount < 5) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is $5"
      });
    }

    // Check balance
    if (withdrawAmount > user.usdcBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    // Check for existing pending withdrawal
    const existingPending = await Transaction.findOne({
      user: user._id,
      type: 'withdrawal',
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending withdrawal request"
      });
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'withdrawal',
      amount: withdrawAmount,
      status: 'pending',
      walletAddress: user.walletAddress
    });

    await transaction.save();

    // Deduct from balance immediately (will be restored if rejected)
    user.usdcBalance -= withdrawAmount;
    
    // Add activity
    user.recentActivity.unshift({
      action: `Requested withdrawal of $${withdrawAmount}`,
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Withdrawal request submitted successfully. Pending admin approval." 
    });

  } catch (error) {
    console.error("Request withdrawal error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Cancel Withdrawal (only if pending)
exports.cancelWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.session.userId,
      type: 'withdrawal',
      status: 'pending'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Pending withdrawal not found"
      });
    }

    const user = await User.findById(req.session.userId);

    // Restore balance
    user.usdcBalance += transaction.amount;
    
    // Update transaction status
    transaction.status = 'cancelled';
    await transaction.save();

    // Add activity
    user.recentActivity.unshift({
      action: `Cancelled withdrawal of $${transaction.amount}`,
      timestamp: new Date()
    });

    if (user.recentActivity.length > 10) {
      user.recentActivity = user.recentActivity.slice(0, 10);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get Transaction History
exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transaction history"
    });
  }
};