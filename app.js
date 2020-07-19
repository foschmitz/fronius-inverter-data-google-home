/*
This is very dirty and just a quickie to get my inverter data online. If you read this I feel sorry for you :D
*/
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cron = require("node-cron");
var express = require("express");
var fs = require("fs");
const request = require('request');

var express = require("express");
var app = express();

var power_from_battery = null;
var power_from_grid = null;
var power_from_pv = null;
var power_usage = null;

// schedule tasks to poll the inverters
cron.schedule("* * * * *", function() {
  console.log("running a task every minute");
  update_data();
});

app.listen(3001, () => {
 console.log("Server running on port 3001");
});


app.get("/inverter-data", (req, res, next) => {
 res.json({"power_from_battery":power_from_battery,"power_from_grid":power_from_grid,"power_from_pv":power_from_pv,"power_usage":power_usage});
});

app.get("/update-data", (req, res, next) => {
  update_data();
  res.sendStatus(200);
});

async function update_data() {
  console.log("updating data...")
  try {
        const symo = await get_local_inverter_data('http://192.168.1.84/solar_api/v1/GetPowerFlowRealtimeData.fcgi')
        const primo = await get_local_inverter_data('http://192.168.1.85/solar_api/v1/GetPowerFlowRealtimeData.fcgi')
        power_from_pv = symo.Body.Data.Site.P_PV + primo.Body.Data.Site.P_PV;
        power_from_battery = symo.Body.Data.Site.P_Akku;
        power_from_grid = symo.Body.Data.Site.P_Grid;
        power_usage = power_from_grid + power_from_pv; // this will be wrong when the battery is charging, need to find the data from the smart meter
    } catch (error) {
        console.error('ERROR:',error);
    }
}

//here be security dragons
function get_local_inverter_data(inverterUrl) {
    return new Promise((resolve, reject) => {
        request(inverterUrl, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(JSON.parse(body));
        });
    });
}
module.exports = app;
