import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;
    console.log("Received data:", req.body);

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a simple user object (without hashing or checking for existing users)
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword, // Temporarily skip hashing
    });
    // Save user to database
    console.log("Saving new user...");
    await newUser.save();
    console.log("New user saved successfully!");
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    console.error(err); // Log the full error for debugging
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// Login route handler
router.post("/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;

    let user;

    if (loginId && loginId?.includes('@')) {
      user = await User.findOne({ email: loginId });
    } else {
      user = await User.findOne({ username: loginId });
    }

    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');

    req.session.user = { id: user.id, username: user.username };
    res.status(200).json({ msg: "Login successful", user: { id: user.id, username: user.username } }); // Send user data
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

export default router;
