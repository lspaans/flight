var bodyParser = require("body-parser");
var express = require("express");
var fs = require("fs");
var http = require("http");
var methodOverride = require("method-override");
var morgan = require("morgan");
var mysql = require("mysql");
var path = require("path");


var exit = function(message, code) {
    log(message, code);
    process.exit(code);
};


var log = function(message, code) {
    if (
        code === undefined ||
        code == 0
    ) {
        console.log(message);
    } else {
        console.error(message);
    }
};


var get_app = function(config, dbconn) {
    try {
        var app = express();
    
        app.set("port", config.http.port || 9090);
        app.set("views", __dirname + config.html.views);
        app.set("view engine", "jade");
    
        app.use(morgan("dev"));
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(methodOverride());
        app.use(express.static(path.join(__dirname, "public")));

        app.get("/", function(req, res) {
            dbconn.query({
                sql: 'SELECT ' +
                    'COUNT(*) AS flights ' +
                    'FROM `flights` ' +
                    'WHERE last_update > NOW() - INTERVAL ? MINUTE;',
                timeout: 40000,
                values: ['1']
            }, function(error, results, fields) {
                if (error !== null) {
                    console.log("Error: '" + error + "'");
                    return;
                };
                res.render("index", {
                    text: JSON.stringify(results)
                });
            });
        });
    } catch (e) {
        exit("Cannot initialise application, reason: '" + e + "'", 255);
    }

    return(app);
};


var get_config = function() {
    try {
        var config = JSON.parse(fs.readFileSync("config.json"));
    } catch (e) {
        exit(
            "Cannot parse configuration file: '" + "config.json" + "', " + 
            "reason: '" + e + "'",
            255
        );
    }
    return(config);
};


var get_dbconn = function(config) {
    var dbconn = mysql.createConnection({
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database
    });

    dbconn.connect(function(err) {
        if (err) {
            exit(
                "Cannot establish database connection, " +
                "reason: '" + err.stack + "'",
                255
            );
        }
        log(
            "Established database connection: '" + dbconn.threadId + "'"
        );
    });

    return(dbconn);
};


var init_process = function() {
    process.on('SIGINT', function() {
        exit("\nDetected CTRL-C; Exiting process");
    });
};


var start_server = function(app) {
    http.createServer(app).listen(app.get("port"), function() {
        log("Express server listening on port: " + app.get("port"));
    });
};


var main = function() {
    init_process();

    var config = get_config();
    var dbconn = get_dbconn(config);
    var app = get_app(config, dbconn);

    start_server(app);
};


if (require.main === module) {
    main();
}
