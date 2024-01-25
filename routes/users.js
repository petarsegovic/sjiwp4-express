const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { db } = require("../services/db.js");
const { getUserJwt, authRequired, checkEmailUique } = require("../services/auth.js");
const bcrypt = require("bcrypt");

// GET /users/data
router.get("/data", authRequired, function (req, res, next) {
  res.render("users/data", { result: { display_form: true } });
});

// POST /users/data
router.post("/data", authRequired, function (req, res, next) {
  // do validation
  const result = schema_data.validate(req.body);
  if (result.error) {
    res.render("users/ata", { result: { validation_error: true, display_form: true } });
    return;
  }
  const newName = req.body.name;
  const newEmail = req.body.email;
  const newPassword = req.body.password;
  const currentUser = req.user;

  let dataChange = [];
  let emailChange = false;
  if (newEmail !== currentUser.email) {
    if (!checkEmailUique(newEmail)) {
      res.render("users/data", { result: { email_in_use: true, display_form: true } });
      return;
    }

  }

  emailChange = true;
  dataChange.push(newEmail);

  let nameChange = false;
  if (newName !== currentUser.name) {
    nameChange = true;
    dataChange.push(newName);
  }
  let passwordChange = false;
  let passwordHash;
  if (newPassword && newPassword.length > 0) {
    passwordHash = bcrypt.hashSync(newPassword, 10);
    passwordChange = true;
    dataChange.push(passwordHash);
  }
  if (!emailChange && !nameChange && !passwordChange) {
    res.render("users/data", { result: { display_form: true } });
    return;
  }
  let query = "UPDATE users SET";
  if (emailChange) query += " email =?,";
  if (nameChange) query += " name =?,";
  if (passwordChange) query += " password =?,";
  query = query.slice(0, -1);
  query += " WHERE email = ?;"
  dataChange.push(currentUser.email);
  const stmt = db.prepare(query);
  const updateResult = stmt.run(dataChange);

  if (updateResult.changes && updateResult.changes === 1) {
    res.render("users/data", { result: { success: true } });
  }
  else {
    res.render("users/data", { result: { display_error: true } });
  }


});



// SCHEMA data
const schema_data = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().max(50).required(),
  password: Joi.string().min(3).max(50).allow(null, "")
});

// GET /users/signout
router.get("/signout", authRequired, function (req, res, next) {
  res.clearCookie(process.env.ATUH_COOKIE_NAME);
  res.redirect("/");
});

// GET /users/signin
router.get("/signin", function (req, res, next) {
  res.render("users/signin", { result: { display_form: true } });
});

// SCHEMA signin
const schema_signin = Joi.object({
  email: Joi.string().email().max(50).required(),
  password: Joi.string().min(3).max(50).required()
});

// POST /users/signin
router.post("/signin", function (req, res, next) {
  // do validation
  const result = schema_signin.validate(req.body);
  if (result.error) {
    res.render("users/signin", { result: { validation_error: true, display_form: true } });
    return;
  }

  const email = req.body.email;
  const password = req.body.password;

  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  const dbResult = stmt.get(email);

  if (dbResult) {
    const passwordHash = dbResult.password;
    const compareResult = bcrypt.compareSync(password, passwordHash);

    if (!compareResult) {
      res.render("users/signin", { result: { invalid_credentials: true } });
    }

    const token = getUserJwt(dbResult.id, dbResult.email, dbResult.name, dbResult.role);
    res.cookie(process.env.ATUH_COOKIE_NAME, token);

    res.render("users/signin", { result: { success: true } });
  } else {
    res.render("users/signin", { result: { invalid_credentials: true } });
  }
});

// SCHEMA signup
const schema_signup = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().max(50).required(),
  password: Joi.string().min(3).max(50).required(),
  password_check: Joi.ref("password")
});

// GET /users/signup
router.get("/signup", function (req, res, next) {
  res.render("users/signup", { result: { display_form: true } });
});

// POST /users/signup
router.post("/signup", function (req, res, next) {
  // do validation
  const result = schema_signup.validate(req.body);
  if (result.error) {
    res.render("users/signup", { result: { validation_error: true, display_form: true } });
    return;
  }


  if (!checkEmailUique(req.body.email)) {
    res.render("users/signup", { result: { email_in_use: true, display_form: true } });
    return;
  }

  const passwordHash = bcrypt.hashSync(req.body.password, 10);
  const stmt2 = db.prepare("INSERT INTO users (email, password, name, signed_at, role) VALUES (?, ?, ?, ?, ?);");
  const insertResult = stmt2.run(req.body.email, passwordHash, req.body.name, Date.now(), "user");

  if (insertResult.changes && insertResult.changes === 1) {
    res.render("users/signup", { result: { success: true } });
  } else {
    res.render("users/signup", { result: { database_error: true } });
  }
});

module.exports = router;
