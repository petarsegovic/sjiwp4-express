const express = require("express");
const router = express.Router();
const {   authRequired, parseAuthCookie } = require("../services/auth.js");

// GET /
router.get("/", [parseAuthCookie, authRequired], function (req, res, next) {
  res.render("competitions/index");
});

module.exports = router;
