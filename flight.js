var bodyParser = require("body-parser");
var express = require("express");
var fs = require("fs");
var http = require("http");
var methodOverride = require("method-override");
var morgan = require("morgan");
var mysql = require("mysql");
var path = require("path");

var config = JSON.parse(fs.readFileSync("config.json"));
var connection = mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password
});
var app = express();

app.set("port", process.env.PORT || 9090);
app.set("views", __dirname + "/view");
app.set("view engine", "jade");

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, "public")));

connection.connect(function(err) {
    if (err) {
        console.error("Error connection: " + err.stack);
        return;
    }
    console.log("connected as id " + connection.threadId);
});

app.get("/", function(req, res) {
    res.render("index", {
        text: "flight"
    });
});

http.createServer(app).listen(app.get("port"), function() {
    console.log("Express server listening on port " + app.get("port"));
});
