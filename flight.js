var bodyParser = require("body-parser");
var express = require("express");
var fs = require("fs");
var http = require("http");
var methodOverride = require("method-override");
var morgan = require("morgan");
var mysql = require("mysql");
var path = require("path");
var strftime = require("strftime");

var SQL_CURRENT_FLIGHTS = "SELECT " +
      "fl.flight, " +
      "al.airline, " +
      "al.country, " +
      "LPAD(HEX(fl.squawk), 4, '0'), " +
      "CONCAT(COALESCE(fl.alt), 'ft.'), " +
      "CONCAT(FORMAT(COALESCE(fl.lat), 5), '˚'), " +
      "CONCAT(FORMAT(COALESCE(fl.lon), 5), '˚')," +
      "CONCAT(COALESCE(fl.heading), '˚'), " +
      "CONCAT(COALESCE(fl.speed), 'kt.'), " +
      "DATE_FORMAT(fl.last_update, '%Y-%m-%d %T') " +
  "FROM flights fl " +
  "JOIN airlines al ON al.icao = fl.airline " +
  "WHERE last_update > NOW() - INTERVAL ? SECOND " + 
  "GROUP BY fl.flight";

var STAT_HEADER = [
    "Call sign",
    "Airline",
    "Country",
    "Squawk",
    "Altitude",
    "Latitude",
    "Longitude",
    "Heading",
    "Speed",
    "Last seen"
];


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
    };
};


var get_app = function(config, dbpool) {
    try {
        var app = express();

        app.set("address", config.http.address || "127.0.0.1");    
        app.set("port", config.http.port || 9090);
        app.set("views", __dirname + config.html.views);
        app.set("view engine", "jade");
    
        app.use(morgan("dev"));
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(methodOverride());
        app.use(express.static(path.join(__dirname, "public")));

        app.get("/", function(req, res) {
            render_main(req, res, config, dbpool);
        });
    } catch (e) {
        exit("Cannot initialise application, reason: '" + e + "'", 255);
    };

    return(app);
};


var render_main = function(req, res, config, dbpool) {
    dbpool.getConnection(function(err, dbconn) {
        if (err) {
            connection.release();

            res.render("flight", {
                flights: [],
                header: STAT_HEADER,
                status: "Cannot establish database connection"
            });

            return;
        };

        console.log(
            "Established database connection with id: " +
            dbconn.threadId
        );

        dbconn.query({
                sql: SQL_CURRENT_FLIGHTS,
                timeout: 5000
            },
            [config.flight.period || 60],
            function(err, rows) {
                dbconn.release();
                if (!err) {
                    res.render("flight", {
                        flights: rows,
                        header: STAT_HEADER,
                        status: strftime(
                            "Refreshed at %Y-%m-%d %H:%M:%S", new Date()
                        )
                    });
                };
        });

        dbconn.on("error", function(err) {
            res.render("flight", {
                flights: [],
                header: STAT_HEADER,
                status: "Cannot establish database connection"
            });
            return;
        });
    });
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
    };

    return(config);
};


var get_dbpool = function(config) {
    var dbpool = mysql.createPool({
        connectionLimit: config.mysql.max_connections,
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database
    });

    return(dbpool);
};


var init_process = function() {
    process.on('SIGINT', function() {
        exit("\nDetected CTRL-C; Exiting process");
    });
};


var start_server = function(app) {
    http.createServer(app).listen(
        app.get("port"),
        app.get("address"),
        function() {
            log(
                "Express server listening on socket: " +
                app.get("address") + ":" + app.get("port")
            );
        }
    );
};


var main = function() {
    init_process();

    var config = get_config();
    var dbpool = get_dbpool(config);
    var app = get_app(config, dbpool);

    start_server(app);
};


if (require.main === module) {
    main();
};
