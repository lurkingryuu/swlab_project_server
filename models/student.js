const mongoose = require("mongoose");

const Student = mongoose.model(
  "Student",
  new mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true,
    },
    username: String,
    name: String,
    email: String,
    password: String,
    phone: String,
    dept: String,
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  })
);

module.exports = Student;
