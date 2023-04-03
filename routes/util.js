const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../models/admin");
const Student = require("../models/student");
const Teacher = require("../models/teacher");

dotenv.config();

const router = express.Router();

// jwt middleware
router.use(async (req, res, next) => {
  try {
    // get token from header and verify
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // get user from db
    const user =
      (await Admin.findOne({ email: decoded.email }).select("+password")) ||
      (await Teacher.findOne({ email: decoded.email }).select("+password"));

    // if user not found
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
