const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

//db
const mongoose = require("mongoose");
mongoose.connect(process.env.DB, (err) => {
  if (err) return console.error("failed to connect to db: ", err);
});
//user collections
const UserSchema = new mongoose.Schema({
  username: String,
});
const userModel = mongoose.model("userModel", UserSchema);

//exercise log collection
const ExercisesSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String,
  id: String,
});
const exerciseModel = mongoose.model("exercisesModel", ExercisesSchema);

//bodyparser for getting body data
const bodyParser = require("body-parser");
const req = require("express/lib/request");
//add username
app.post(
  "/api/users",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let newUser = new userModel({ username: req.body.username });
    res.json({ username: newUser.username, _id: newUser._id });
    newUser.save();
  }
);

//add exercise
app.post(
  "/api/users/:_id/exercises",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    // error when field is empty
    if (!req.body.description)
      return res.send("Path `description` is required.");
    if (!req.body.duration) return res.send("Path `duration` is required.");
    // set "date"
    let date =
      !req.body.date || req.body.date === ""
        ? new Date().toDateString()
        : new Date(req.body.date).toDateString();

    // get username
    userModel.findById(req.params._id, function (err, user) {
      if (err || !user) return res.send("Unknown userId");
      let newExercise = new exerciseModel({
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date,
        id: req.params._id,
      });
      newExercise.save();
      let responseObj = {
        _id: newExercise.id,
        username: user.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: date,
      };
      res.json(responseObj);
    });
  }
);

//get user's exercise log
app.get("/api/users", function (req, res) {
  userModel.find({}, function (err, arrayOfuser) {
    if (err) return res.send(err);
    let ans = [];
    arrayOfuser.forEach((item) =>
      ans.push({ _id: item._id, username: item.username })
    );
    res.send(ans);
  });
});

app.get("/api/users/:_id/logs", function (request, res) {
  exerciseModel.find({ id: request.params._id }, function (err, arrayOflog) {
    if (err) return res.send(err);
    let fromQuery = new Date(request.query.from || "1970-01-01");
    let toQuery = new Date(request.query.to || "9999-01-01");
    let limitQuery = request.query.limit || Number.MAX_VALUE;
    userModel.findById(request.params._id, (err, user) => {
      if (!err && user) {
        let logs = {};
        logs["_id"] = user._id;
        logs["username"] = user.username;
        let slicedLogs = [];
        for (let item of arrayOflog) {
          if (slicedLogs.length == limitQuery) break;
          let itemDate = new Date(item.date);
          if (itemDate >= fromQuery && itemDate <= toQuery) {
            slicedLogs.push({
              description: item.description,
              duration: item.duration,
              date: itemDate.toDateString(),
            });
          }
        }
        logs["log"] = slicedLogs;
        logs["count"] = slicedLogs.length;
        res.json(logs);
      }
    });
  });
});
