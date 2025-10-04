const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../model/userSchema');
const Party = require('../model/partySchema');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const stateDataPath = path.join(
  'C:',
  'Users',
  'Shubh Vikani',
  'Downloads',
  'Sem7_project',
  'Sem7_project',
  'my-app',
  'src',
  'data',
  'StateData.json'
);

// Import the JSON
let data1 = require(stateDataPath);

// Route Definitions
router.get('/', (req, res) => {
  res.send('Hello from router 22');
});

// Registration Route
router.post('/regi', async (req, res) => {
  const { name, email, phone, age, state, password, cpassword } = req.body;

  if (!name || !email || !phone || !age || !state || !password || !cpassword) {
    return res.status(422).json({ error: 'please fill it' });
  }

  try {
    const userExist = await User.findOne({ email });
    const userphone = await User.findOne({ phone });
    if (userExist || userphone) {
      return res.status(422).json({ error: 'user exists' });
    } else if (password != cpassword) {
      return res.status(422).json({ error: 'password and confirm password must be same' });
    } else {
      if (age < 18) {
        return res.status(402).json({ error: 'age must be greater than or equal to 18' });
      }
      const user = new User({ name, email, phone, age, state, password, cpassword });
      await user.save();
      res.status(201).json({ message: 'user registered' });
    }
  } catch (err) {
    console.log(err);
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(422).json({ error: "please fill it" });
    }

    const userSignIn = await User.findOne({ phone: phone });
    if (userSignIn) {
      const isMatch = await bcrypt.compare(password, userSignIn.password);
      const token = await userSignIn.generateToken();

      res.cookie("userData", token, {
        expires: new Date(Date.now() + 999999999),
        httpOnly: true,
      });

      if (!isMatch) {
        return res.status(404).json({ error: "Invalid Credentials pass" });
      } else {
        return res.status(200).json({ message: "user SignedIn Succesfully", token, admin: userSignIn.isAdmin });
      }
    } else {
      return res.status(404).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    console.log(err);
  }
});

// Get User Info
router.get('/about', authenticate, (req, res) => {
  res.send(req.rootUser);
});

// Edit User Info
router.put('/about', authenticate, async (req, res) => {
  const { name, email, phone, age } = req.body;

  if (!name || !email || !phone || !age) {
    return res.status(422).json({ error: "please fill it" });
  }

  try {
    const userSignIn = await User.findOne({ email: email });
    if (userSignIn) {
      userSignIn.name = name;
      userSignIn.email = email;
      userSignIn.phone = phone;
      userSignIn.age = age;

      await userSignIn.save();
      return res.status(201).json({ message: "user edited succesfully" });
    } else {
      return res.status(404).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    console.log(err);
    return res.status(404).json({ error: "Invalid Credentials" });
  }
});

// Verify User
router.post('/verify', async (req, res) => {
  try {
    const { phone } = req.body;
    const userSignIn = await User.findOne({ phone: phone });
    if (userSignIn) {
      return res.status(201).json({ message: "User is present" });
    }
  } catch (err) {
    console.log(err);
    return res.status(404).json({ error: "Invalid Credentials" });
  }
});

// Logout Route
router.get('/logout', (req, res) => {
  const token = req.headers.token;
  res.clearCookie(token, { path: '/' });
  res.status(200).send('user logged out');
});

// Reset Password Route
router.put('/reset', async (req, res) => {
  const { phone, password, cpassword } = req.body;

  try {
    if (!password || !cpassword) {
      return res.status(422).json({ error: "please fill it" });
    } else if (password != cpassword) {
      return res.status(422).json({ error: "password and confirm password must be same" });
    } else {
      const userSignIn = await User.findOne({ phone: phone });
      if (userSignIn) {
        userSignIn.password = password;
        userSignIn.cpassword = cpassword;

        await userSignIn.save();
        return res.status(201).json({ message: "password updated" });
      } else {
        return res.status(404).json({ error: "Invalid Credentials" });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

// Contact Route
router.post('/contact', authenticate, async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !phone || !subject || !message) {
    return res.status(422).json({ error: "please fill it" });
  }

  const userQuery = await User.findOne({ email: email });
  if (userQuery) {
    await userQuery.contactUs(name, email, phone, subject, message);
    res.status(200).json({ message: "your query has been submitted" });
  } else {
    res.status(404).json({ error: "user not found" });
  }
});

// Voter Registration Route
router.post('/voter', authenticate, async (req, res) => {
  const { voter, faceResult } = req.body;
  const { x, y, score } = faceResult;

  try {
    const voterRegi = await User.findOne({ voterId: voter });
    if (voterRegi) {
      return res.status(422).json({ error: 'VoterId Already Exist' });
    } else {
      const token = req.headers.token;
      let count = 0;

      const userSignIn = await User.findOne({ 'tokens.token': token });
      if (userSignIn) {
        const faceAll = await User.find({});

        faceAll.forEach(value => {
          if (
            value.faceResult?.x != undefined &&
            value.faceResult?.y != undefined &&
            value.faceResult?.score != undefined
          ) {
            if (
              (x < value.faceResult.x || y < value.faceResult.y || score < value.faceResult.score) &&
              !(x < value.faceResult.x - 20) &&
              !(y < value.faceResult.y - 20) &&
              !(score < value.faceResult.score - 0.1)
            ) {
              count = 1;
              return res.status(402).json({ message: "Face Id already Registered" });
            } else if (
              !(x > value.faceResult.x + 20) &&
              !(y > value.faceResult.y + 20) &&
              !(score > value.faceResult.score + 0.1)
            ) {
              count = 1;
              return res.status(402).json({ message: "Face Id already Registered" });
            }
          }
        });
        userSignIn.voterId = voter;
        userSignIn.faceResult = faceResult;

        if (count == 0) {
          await userSignIn.save();
          return res.status(201).json({ message: "Voter Id Registered" });
        }
      }
    }
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: "Some Error occured" });
  }
});

// Get Voter Status
router.get('/voter', authenticate, async (req, res) => {
  const token = req.headers.token;
  const userSignIn = await User.findOne({ 'tokens.token': token });
  if (userSignIn.voterId) {
    return res.status(201).json({ message: 'Voter Id is Checked' });
  } else {
    return res.status(401).json({ message: 'Voter Id missing' });
  }
});

// Get State
router.get('/state', authenticate, async (req, res) => {
  const token = req.headers.token;
  const userSignIn = await User.findOne({ 'tokens.token': token });
  if (userSignIn) {
    const state = userSignIn.state;
    const isVoted = userSignIn.isVoted;
    const email = userSignIn.email;
    const userName = userSignIn.name;
    return res.send({ state, email, isVoted, userName });
  } else {
    return res.status(401).json({ message: 'Invalid Token' });
  }
});

// Voting Route
router.post('/voted', authenticate, async (req, res) => {
  const token = req.headers.token;
  const { partyName, Id } = req.body;

  const count = 1;

  const userSignIn = await User.findOne({ 'tokens.token': token });
  if (userSignIn.isVoted) {
    return res.status(401).json({ error: "Voter Already Voted" });
  } else {
    const voted = await Party.findOne({ partyName: partyName });
    if (voted) {
      voted.vote = voted.vote + count;
      await voted.save();
      userSignIn.isVoted = true;
      await userSignIn.save();
      return res.status(201).json({ message: "Vote Successfully Added" });
    } else {
      const newParty = new Party({ partyName, Id });
      await newParty.save();

      const votedCheck = await Party.findOne({ partyName: partyName });
      if (votedCheck) {
        votedCheck.vote = 0 + count;
        await votedCheck.save();
        userSignIn.isVoted = true;
        await userSignIn.save();
        return res.status(201).json({ message: "Vote Successfully Added" });
      }
    }
  }
});

// Mail Route
router.post("/mail", authenticate, async (req, res) => {
  const code = req.headers.token.toString();

  try {
    const { state, email, userName } = req.body;

    var transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      service: 'gmail',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: 'vedantkhamar975@gmail.com',
        pass: 'kvqxyzzsfayyljxq'
      }
    });
    var mail = {
      from: "vedantkhamar975@gmail.com",
      to: email,
      subject: `Ballot Submitted for 2023 ${state} Election`,
      html: `<h1>Hello ${userName}</h1><br/>
            <h2>Your Vote has been Registered Succesfully</h2>
            <h2>Confirmation Code: <b>${code.slice(code.length-10, code.length)}</b></h2><br/>
            <h2>For any queries kindly contact us at vedantkhamar975@gmail.com</h2>`,
    };
    transporter.sendMail(mail, function (err, info) {
      if (err) {
        res.json({ success: false, error: err });
      } else {
        res.status(200).json({ success: true, message: "Message sent" });
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: 'error' });
  }
});

// Get Parties Route
router.get('/parties', authenticate, async (req, res) => {
  try {
    const parties = await Party.find({});
    return res.send(parties);
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: 'Invalid Token' });
  }
});

// Add Party Route
router.post('/addParty', authenticate, async (req, res) => {
  try {
    const { state, partyName, Id, contestantName } = req.body;

    const party = {
      name: partyName,
      constestant: contestantName,
      image: '', // Placeholder
      id: parseInt(Id),
    };
    data1.forEach(value => {
      if (value.state === state) {
        value.parties.push(party);
      }
    });
    fs.writeFile(stateDataPath, JSON.stringify(data1), err => {
      if (err) console.log(err);
    });
    return res.status(201).json({ message: 'Party Added' });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: 'Invalid Token' });
  }
});

// Delete Party Route
router.post('/deleteParty', authenticate, async (req, res) => {
  try {
    let partyDetails = {};
    let parties = [];
    let index = 0;

    const { state, partyName } = req.body;

    data1.forEach(value => {
      if (value.id === state) {
        parties = value.parties;

        parties.forEach(val => {
          if (val.name === partyName) {
            partyDetails = val;
          }
        });
        index = parties.indexOf(partyDetails);
        parties.splice(index, 1);
        value.parties = parties;
      }
    });
    fs.writeFile(stateDataPath, JSON.stringify(data1), err => {
      if (err) console.log(err);
    });
    return res.status(201).json({ message: 'Party Deleted' });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: 'Invalid Token' });
  }
});

module.exports = router;

