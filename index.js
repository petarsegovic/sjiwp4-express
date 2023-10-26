const express = require("express");
const req = require("express/lib/request");
const app = express();
const port = 8080;

app.set("view engine","ejs");

app.get("/", (request, response) => {
     let result = {
          name: "Ivo"
     }
     response.render("index",result)});

app.listen(port, () => {console.log("I am listening...")});