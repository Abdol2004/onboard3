const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const questRoutes = require("./routes/questRoutes");
const referralRoutes = require("./routes/referralRoutes");
const eventRoutes = require("./routes/eventRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const courseRoutes = require("./routes/courseRoutes");
const adminRoutes = require("./routes/adminRoutes");
const xFollowRoutes = require("./routes/xFollowRoutes");
const cors = require('cors');
dotenv.config();
const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "your_secret_key_change_in_production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(cors());
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Auth middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth');
};

app.use("/api/events", eventRoutes);

// Routes
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/dashboard/quests", questRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/dashboard/referral", referralRoutes);
app.use("/dashboard/settings", settingsRoutes);
app.use("/api/learn", courseRoutes);
app.use("/dashboard/x-follow", xFollowRoutes);
app.use("/admin", adminRoutes);


app.get("/", (req, res) => {
  res.render("index", { 
    title: "Home Page",
    user: req.session.userId ? { username: req.session.username } : null
  });
});

app.get("/about", (req, res) => {
  res.render("about", { 
    title: "About Page",
    user: req.session.userId ? { username: req.session.username } : null
  });
});
app.get("/pitch", (req, res) => {
  res.render("pitch", { 
    title: "Pitch Deck",
    user: req.session.userId ? { username: req.session.username } : null
  });
});

app.get("/irl", (req, res) => {
  res.render("irl", { 
    title: "Event Page",
    user: req.session.userId ? { username: req.session.username } : null
  });
});

app.get("/partner", (req, res) => {
  res.render("partner", { 
    title: "Partnership Page",
    user: req.session.userId ? { username: req.session.username } : null
  });
});
app.get("/dashboard/referral", isAuthenticated, (req, res) => {
  res.redirect('/dashboard/referral/');
});
app.get("/dashboard/quest", isAuthenticated, (req, res) => {
  res.redirect('/dashboard/quest/');
});

app.get("/dashboard/quest-details/:questId", isAuthenticated, (req, res) => {
  res.redirect(`/dashboard/quest/${req.params.questId}`);
});

app.get("/dashboard/events", isAuthenticated, (req, res) => {
  res.render("dashboard/event", { 
    title: "Events",
    user: req.session.userId ? { username: req.session.username } : null
  });
});

app.get("/dashboard/learn", isAuthenticated, (req, res) => {
  res.render("dashboard/learn", { 
    title: "Learn",
    user: req.session.userId ? { username: req.session.username } : null
  });
});
app.get("/dashboard/settings", isAuthenticated, (req, res) => {
  res.render("dashboard/settings", { 
    title: "Learn",
    user: req.session.userId ? { username: req.session.username } : null
  });
});


app.get("/dashboard/events/:eventId", isAuthenticated, (req, res) => {
  res.render("dashboard/event-details", { 
    title: "Event Details",
    eventId: req.params.eventId,
    user: req.session.userId ? { username: req.session.username } : null
  });
});



app.get("/auth", (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render("auth", { 
    title: "Authentication Page"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));