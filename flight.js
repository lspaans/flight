var bodyParser = require("body-parser");
var express = require("express");
var fs = require("fs");
var http = require("http");
var methodOverride = require("method-override");
var morgan = require("morgan");
var mysql = require("mysql");
var path = require("path");


var get_config = function(config) {
    return(JSON.parse(fs.readFileSync("config.json")));
};


var get_dbconn = function(config) {
    var dbconn = mysql.createConnection({
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password
    });

    dbconn.connect(function(err) {
        if (err) {
            console.error("Error connection: " + err.stack);
            return;
        }
        console.log("connected as id " + dbconn.threadId);
    });

    return(dbconn);
};


var get_app = function(config) {
    var app = express();

    app.set("port", config.http.portT || 9090);
    app.set("views", __dirname + config.html.views);
    app.set("view engine", "jade");

    app.use(morgan("dev"));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(methodOverride());
    app.use(express.static(path.join(__dirname, "public")));

    app.get("/", function(req, res) {
        res.render("index", {
            text: "flight"
        });
    });

    return(app);
};


var start_server = function(app) {
    http.createServer(app).listen(app.get("port"), function() {
        console.log("Express server listening on port " + app.get("port"));
    });
};


var main = function() {
    var config = get_config();
    var dbconn = get_dbconn(config);
    var app = get_app(config);

    start_server(app);
};


if (require.main === module) {
    main();
}
