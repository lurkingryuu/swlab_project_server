const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../models/admin");
const Student = require("../models/student");
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
      (await Student.findOne({ email: decoded.email }).select("+password"));

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

// student details
router.get("/", async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// student courses
router.get("/courses", async (req, res) => {
  try {
    const coursesData = []
    for (const course_id of req.user.courses) {
      const course = await Course.findById(course_id);

      coursesData.push({
        Id: course?.courseid,  
        Name: course.coursename
      });
    }
    res.json({data: coursesData});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// enroll in course
router.post("/enroll", async (req, res) => {
  try {
    const { courseid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (req.user.courses.includes(course._id) && course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "Already enrolled" });
    }
    const student = await Student.findOne({ email: req.user.email });
      student.courses.push(course._id);
    await student.save();
    course.students.push(req.user._id);
    await course.save();
    res.json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// unenroll from course
router.delete("/unenroll", async (req, res) => {
  try {
    const { courseid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!req.user.courses.includes(course._id) || !course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "Not enrolled" });
    }
    const student = await Student.findOne({ email: req.user.email });
    student.courses = student.courses.filter((id) => id != course._id);
    await student.save();
    course.students = course.students.filter((id) => id != req.user._id);
    await course.save();
    res.json({ message: "Unenrolled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/getattendance', async (req, res) => {
  try {
    const { courseid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!req.user.courses.includes(course._id) || !course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "Not enrolled" });
    }
    const student_id = req.user._id;

    const date_wise_attendance = [];
    let present = 0, absent = 0;

    course.attendance.forEach((attendance) => {
      if (attendance.present.includes(student_id)) {
        date_wise_attendance.push({
          date: attendance.date,
          present: true,
        });
        present++;
      }
      else {
        date_wise_attendance.push({
          date: attendance.date,
          present: false,
        });
        absent++;
      }
    });

    res.json({attendance: date_wise_attendance, present: present, absent: absent, total: present + absent});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


router.post('/markattendance', async (req, res) => {
  try {
    const { courseid, uid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!req.user.courses.includes(course._id) || !course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "Not enrolled" });
    }
    const student_id = req.user._id;

    let attendance_id;
    course.attendance.forEach((attendance) => {
      if(Date.parse(attendance.start) <= Date.now() && Date.now() <= Date.parse(attendance.end)) {
        attendance_id = attendance._id;
      }
    });

    if (attendance_id) {
      const att = course.attendance.filter((attendance) => attendance._id == attendance_id)[0];
      if(att.present.includes(student_id)) {
        return res.status(400).json({ message: "Attendance already marked" });
      }
      att.present.push(student_id);
      att.signatures.push({studentid: student_id, uid: uid});
    }
    else {
      return res.status(400).json({ message: "Attendance not scheduled" });
    }
    await course.save();
    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
    

// get location of attendance
router.post('/getlocation', async (req, res) => {
  try {
    const { courseid } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!req.user.courses.includes(course._id) || !course.students.includes(req.user._id)) {
      return res.status(400).json({ message: "Not enrolled" });
    }
    const student_id = req.user._id;

    let attendance_id;
    course.attendance.forEach((attendance) => {
      if(Date.parse(attendance.start) <= Date.now() && Date.now() <= Date.parse(attendance.end)) {
        attendance_id = attendance._id;
      }
    });

    if (attendance_id) {
      const att = course.attendance.filter((attendance) => attendance._id == attendance_id)[0];
      return res.json({ location: att.location });
    }
    else {
      return res.status(400).json({ message: "Attendance not scheduled" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
