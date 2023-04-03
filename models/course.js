const mongoose = require("mongoose");

const Course = mongoose.model(
  "Course",
  new mongoose.Schema({
    courseid: String,
    coursename: String,
    teachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    attendance: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        present: [
          {
            studentid: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
            uid: String,
          },
        ],
        absent: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
        ],
        signatures: [
          {
            studentid: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
            uid: String,
          },
        ],
        start: {
          type: Date,
        },
        end: {
          type: Date,
        },
      },
    ],
  })
);

module.exports = Course;
