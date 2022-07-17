var express = require('express');
var app = express();
var sql = require('mssql');
var cors = require('cors');
var dotenv = require('dotenv');


var productionplanning = require('./queries/productionQuery');
var labor = require('./queries/laborQuery');
var preferences = require('./queries/perferenceQuery');

// var edge = require('edge-js');
const spawn = require('child_process').spawnSync;

var async = require('async');

var calculator = require("business-days-calculator");

dotenv.config();

let {
    DB_USER,
    DB_PASSWORD,
    DB_SERVER,
    DB_DATABASE,
    DB_POOL_TIMEOUT_MILLIS,
    DB_POOL_MAX,
    DB_POOL_MIN,
    JWT_SECRET,
    API_PORT
} = process.env;

JWT_SECRET = JWT_SECRET || 'DUMMY';
API_PORT = API_PORT || '5000';

// config for your database
const config = {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE,
    options: { encrypt: false },
    pool: {
        max: parseInt(DB_POOL_MAX),
        min: parseInt(DB_POOL_MIN),
        idleTimeoutMillis: parseInt(DB_POOL_TIMEOUT_MILLIS)
    }
}

//app.use(express.json());

app.use(express.json());

//app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});



app.get('/', cors(), function (req, res) {
    res.status(200).send("Well done, you deployed it on EC2");
});


async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

app.get('/activelabortickets', cors(), function (req, res) {
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(labor.GET_ACTIVE_LABOR_TICKETS, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordset);
        });

    });
});


app.get('/productionplanning/currentweek', cors(), function (req, res) {
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(productionplanning.PRODUCTION_PLANNING_WO_CURRENT_WEEK, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordset);
        });

    });
});

app.get('/productionplanning/week/:week_no', (req, res) => {
    var WEEK_NO = req.params.week_no
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.input('WEEK_NO', WEEK_NO);
        request.query(productionplanning.PRODUCTION_PLANNING_WO_PER_WEEK, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset);
        });

    });
})

app.get('/productionplanning/resource', (req, res) => {
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(productionplanning.PRODUCTION_PLANNING_ALL_SHOP_RESOURCES, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordset);
        });

    });
})

app.get('/productionplanning/resource/:resource_id', (req, res) => {
    var RESOURCE_ID = req.params.resource_id
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.input('RESOURCE_ID', RESOURCE_ID);
        request.query(productionplanning.PRODUCTION_PLANNING_PER_SHOP_RESOURCE, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordset);
        });

    });
})


app.get('/shopresource', (req, res) => {
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(productionplanning.GET_ALL_SHOP_RESOURCES, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordset);
        });

    });
})


app.get('/cantargetstatus', cors(), function (req, res) {
    var mergerdArr = [];
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(productionplanning.GET_PACKSLIPS_VALUE_BASED_ON_CURRENT_MONTH, function (err, recordset) {
            if (err) console.log(err)

            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            var workingDays = calculator.WorkingDaysBetween(firstDay, lastDay);

            var packlists = recordset.recordset;

            var total = 0;
            for (var i = 0; i < packlists.length; i++) {
                total += packlists[i].AMOUNT;
            }

            var lastObject_Amount = packlists.length > 0 ? packlists[packlists.length - 1].AMOUNT : packlists[0].AMOUNT
            var lastObject_month = packlists.length > 0 ? packlists[packlists.length - 1].name : packlists[0].name
            var eachDaySell = 1000000 / workingDays
            var status_month = lastObject_Amount > eachDaySell ? "Green" : "Red"
            var status_overall = (eachDaySell * packlists.length) < total ? "Green" : "Red"

            var f1 = {
                "PACKLISTS": packlists,
                "TOTAL": total,
                "WORKINGDAYS": workingDays,
                "STATUS_MONTH": status_month,
                "STATUS_OVERALL": status_overall
            };

            mergerdArr.push(f1);
            // send records as a response
            res.send(mergerdArr[0]);
        });

    });
});

app.post('/productionplanning/updatewodate', cors(), async function (req, res) {
    const requestObject = {
        BASE_ID: req.body.BASE_ID,
        DESIRED_WANT_DATE: req.body.DESIRED_WANT_DATE
    }

    // console.log(requestObject.DESIRED_WANT_DATE)
    // res.json("OK")
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        request.input('WO', requestObject.BASE_ID);
        request.input('WO_DATE', requestObject.DESIRED_WANT_DATE);
        // query to the database and get the records
        request.query(productionplanning.UPDATE_WORKORDER_WANT_DATE, function (err, recordset) {
            if (err) console.log(err)
            res.json('Success');
        });
    });

})


app.get('/datesforeachso', cors(), function (req, res) {
    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        // query to the database and get the records
        request.query(productionplanning.PRODUCTION_PLANNING_DATE_VALIDATION, function (err, recordset) {
            if (err) console.log(err)
            // send records as a response
            res.send(recordset.recordsets[0]);
        });

    });
});







var server = app.listen(process.env.API_PORT, function () {
    console.log('Server is running..');
});