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
    const user = await Admin.findOne({ email: decoded.email }).select(
      "+password"
    );

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

// admin details
router.get("/", async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.user.email }).select(
      "-password"
    );
    res.json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// add course
router.post("/addcourse", async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.user.email });
    const { courseid, coursename, teachers } = req.body;

    // check if course already exists
    const course_ = await Course.findOne({ courseid });
    if (course_) {
      return res.status(400).json({ message: "Course already exists" });
    }
    // teachers contains employee ids of each teacher, we need to convert them to teacher ids
    let teacher_ids = new Array();
    let teacher_id;
    for (const teacher_empid of teachers) {
      teacher_id = await Teacher.findOne({ id: teacher_empid });
      if (!teacher_id) {
        return res.status(400).json({ message: "Teacher not found" });
      }
      teacher_ids.push(teacher_id._id);
    }

    const course = new Course({
      courseid,
      coursename,
      teachers: teacher_ids,
      students: [],
      attendance: [],
    });

    for (const teacher_id of teacher_ids) {
      const teacher = await Teacher.findById(teacher_id);
      teacher.courses.push(course._id);
      await teacher.save();
    }

    await course.save();
    await admin.save();
    res.json({ message: "Course added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// get all courses
router.get("/courses", async (req, res) => {
  try {
    const coursesData = [];
    const courses = await Course.find();
    for (const course of courses) {
      coursesData.push({
        Id: course.courseid,
        Name: course.coursename,
      });
    }
    res.json({ data: coursesData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// delete course
router.delete("/deletecourse/:courseid", async (req, res) => {
  try {
    let course = await Course.findOne({ courseid: req.params.courseid });
    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    for (const teacher_id of course.teachers) {
      const teacher = await Teacher.findById(teacher_id);
      teacher.courses = teacher.courses.filter(
        (course_id) => String(course_id) != String(course._id)
      );
      await teacher.save();
    }

    for (const student_id of course.students) {
      const student = await Student.findById(student_id);
      student.courses = student.courses.filter(
        (course_id) => String(course_id) != String(course._id)
      );
      await student.save();
    }

    course = await Course.findByIdAndDelete(course._id);

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// get all teachers
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// get all students
router.get("/students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
