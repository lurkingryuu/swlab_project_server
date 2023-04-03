const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../models/admin");
const Student = require("../models/student");
const Teacher = require("../models/teacher");

dotenv.config();

const router = express.Router();

router.post("/signup/admin", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      email: email,
      username: username,
      password: hashedPassword,
    });
    await admin.save();
    res.status(201).json({ message: "Admin created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/signup/student", async (req, res) => {
  try {
    const { rollno, username, email, password, name, dept, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({
      id: rollno,
      username,
      email,
      name,
      password: hashedPassword,
      phone,
      dept,
      courses: [],
    });
    await student.save();
    res.status(201).json({ message: "Student created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/signup/teacher", async (req, res) => {
  try {
    const { empid, email, username, password, name, dept, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = new Teacher({
      id: empid,
      email,
      username,
      name,
      password: hashedPassword,
      phone,
      dept,
      courses: [],
    });
    await teacher.save();
    res.status(201).json({ message: "Teacher created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // check if user exists in any collection
    const user =
      (await Admin.findOne({ email }).select("+password")) ||
      (await Student.findOne({ email }).select("+password")) ||
      (await Teacher.findOne({ email }).select("+password"));

    // if user not found
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// get user type
router.get("/usertype", async (req, res) => {
  try {
    // get token from header and verify
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findOne({ email: decoded.email });
    const student = await Student.findOne({ email: decoded.email });
    const teacher = await Teacher.findOne({ email: decoded.email });

    if (admin) {
      res.json({ usertype: "admin" });
    } else if (student) {
      res.json({ usertype: "student" });
    } else if (teacher) {
      res.json({ usertype: "teacher" });
    } else {
      res.json({ usertype: "none" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
