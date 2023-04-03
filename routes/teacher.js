const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../models/admin");
const Student = require("../models/student");
const Teacher = require("../models/teacher");
const Course = require("../models/course");

dotenv.config();

const router = express.Router();

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

// teacher details
router.get("/", async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: req.user.email }).select(
      "-password"
    );
    res.json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/startattendance', async (req, res) => {
  try {
    const { courseid, time } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the attendance is already started
    course.attendance.forEach((attendance) => {
      if (attendance.end > Date.now()) {
        return res.status(400).json({ message: "Attendance already started" });
      }
    });

    const attendance = {
      date: Date.now(),
      present: [],
      absent: [],
      start: Date.now(),
      end: Date.now() + 1000 * time * 60,
    };
    
    course.attendance.push(attendance);
    await course.save();
    res.json({ message: "Attendance started" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/endattendance', async (req, res) => {
  try {
    const { courseid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the attendance is already started
    let attendance = null;
    course.attendance.forEach((att) => {
      if (att.end > Date.now()) {
        attendance = att;
      }
    });
    
    if (!attendance) {
      return res.status(400).json({ message: "Attendance not started" });
    }

    attendance.end = Date.now();
    await course.save();

    // update student attendance
    course.students.forEach(async (student) => {
      if(!attendance.present.includes(student.studentid)) {
        attendance.absent.push(student.studentid);
      }
    });

    await course.save();

    res.json({ message: "Attendance ended" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;