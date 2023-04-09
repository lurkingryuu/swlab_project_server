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

// courses
router.get("/courses", async (req, res) => {
  try {
    const coursesData = [];
    for (const course_id of req.user.courses) {
      const course = await Course.findById(course_id);
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

router.post("/startattendance", async (req, res) => {
  try {
    const { courseid, time } = req.body;
    const course = await Course.findOne({ courseid: courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are not teaching this course" });
    }

    // check if the attendance is already started
    let attendance_already_found = false;
    course.attendance.forEach((attendance) => {
      if (attendance.end > Date.now()) {
        attendance_already_found = true;
      }
    });
    if (attendance_already_found) {
      return res.status(400).json({ message: "Attendance already started" });
    }

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

router.post("/endattendance", async (req, res) => {
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
      if (!attendance.present.includes(student.studentid)) {
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

// send course details of a particular course
router.get("/courses/:courseid", async (req, res) => {
  try {
    const course = await Course.findOne({ courseid: req.params.courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are not teaching this course" });
    }

    const student_list = [];
    let total_classes = 0;
    let total_students = 0;
    for (const student of course.students) {
      const student_data = await Student.findById(student.studentid);
      student_list.push({
        Id: student_data.id,
        Name: student_data.name,
      });
      total_students++;
    }

    for (const attendance of course.attendance) {
      total_classes++;
    }

    res.json({
      students: student_list,
      total_classes: total_classes,
      total_students: total_students,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// send attendance details of a particular course
router.get("/courses/:courseid/attendance", async (req, res) => {
  try {
    const course = await Course.findOne({ courseid: req.params.courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are not teaching this course" });
    }

    const attendance_list = [];
    for (const attendance of course.attendance) {
      attendance_list.push({
        id: attendance._id,
        date: attendance.date,
        present: attendance.present.length,
        absent: attendance.absent.length,
      });
    }

    res.json({ attendance: attendance_list });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// send student details of attendance of a particular course
router.get("/courses/:courseid/attendance/:attendanceid", async (req, res) => {
  try {
    const course = await Course.findOne({ courseid: req.params.courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are not teaching this course" });
    }

    const attendance = await Attendance.findById(req.params.attendanceid);

    if (!attendance) {
      return res.status(400).json({ message: "Attendance not found" });
    }

    const present_list = [];
    const absent_list = [];
    for (const student of course.students) {
      const student_data = await Student.findById(student.studentid);
      if (attendance.present.includes(student.studentid)) {
        present_list.push({
          Id: student_data.id,
          Name: student_data.name,
        });
      } else {
        absent_list.push({
          Id: student_data.id,
          Name: student_data.name,
        });
      }
    }

    res.json({
      present: present_list,
      absent: absent_list,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// get possible proxies
router.get("/proxies/:courseid", async (req, res) => {
  try {
    const course = await Course.findOne({ courseid: req.params.courseid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res.status(400).json({ message: "You are not teaching this course" });
    }

    const days = [];

    for (attendance of course.attendance) {
      const proxies = [];
      for (student of attendance.present) {
        const stu = await Student.findById(student.studentid);
        if (proxies[student.uid] === undefined) {
          proxies[student.uid] = [];
        }
        proxies[student.uid].push({
          "Name": stu.name,
          "Id": stu.id,
        });
      }

      for (proxy of proxies) {
        if (proxy.length <= 1) {
          proxies.splice(proxy, 1);
        }
      }

      days.push({
        "date": attendance.date,
        "id": attendance._id,
        "proxies": proxies,
      });
    }

    res.json({ proxies: days });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// delete attendance
router.delete("/deleteattendance/:attendanceid/:studentid", async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.attendanceid);

    if (!attendance) {
      return res.status(400).json({ message: "Attendance not found" });
    }

    const course = await Course.findOne({ attendance: req.params.attendanceid });

    if (!course) {
      return res.status(400).json({ message: "Course not found" });
    }

    // check if the teacher is teaching the course
    if (!course.teachers.includes(req.user._id)) {
      return res.status(400).json({ message: "You are not teaching this course" });
    }

    const student = await Student.findById(req.params.studentid);

    if (!student) {
      return res.status(400).json({ message: "Student not found" });
    }

    if (attendance.present.includes(student._id)) {
      attendance.present.forEach((element, index) => {
        if (element['studentid'] == student._id) {
          attendance.present.splice(index, 1);
        }
      });
      attendance.absent.push(student._id);
    } else {
      return res.status(400).json({ message: "Student is already absent" });
    }

    await attendance.save();

    res.json({ message: "Attendance updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }

});


module.exports = router;
