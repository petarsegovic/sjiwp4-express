const express = require("express");
const req = require("express/lib/request");
const app = express();
const port = 8080;

app.get("/", (request, response) => {
     response.send("I am alive!")});

app.listen(port, () => {console.log("I am listening...")});