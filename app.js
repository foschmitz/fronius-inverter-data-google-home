/*
This is very dirty and just a quickie to get my inverter data online. If you read this I feel sorry for you :D
*/
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var express = require("express");
var fs = require("fs");
const request = require('request');

var express = require("express");
var app = express();
var schedule_lock = false;
var pv_data = {
  power_from_battery : null,
  power_from_grid : null,
  power_from_pv : null,
  power_usage : null
};


app.listen(3001, () => {
 console.log("Server running on port 3001");
 // intial update
 update_data();
 // Start Polling Inverters and Smart Meter
 setInterval(function() {
   update_data();
 },15000);
});


app.get("/inverter-data", (req, res, next) => {
 res.json(pv_data);
});

app.get("/update-data", (req, res, next) => {
  update_data();
  res.sendStatus(200);
});

async function update_data() {
  console.log("updating data...")
  try {
      if (!schedule_lock) {
        schedule_lock = true;
        const symo = await get_local_inverter_data('http://192.168.1.84/solar_api/v1/GetPowerFlowRealtimeData.fcgi');
        const primo = await get_local_inverter_data('http://192.168.1.85/solar_api/v1/GetPowerFlowRealtimeData.fcgi');
        const powermeter = await get_local_inverter_data('http://192.168.1.84/solar_api/v1/GetMeterRealtimeData.cgi?Scope=Device&DeviceId=0');
        pv_data.power_from_pv = symo.Body.Data.Site.P_PV + primo.Body.Data.Site.P_PV;
        pv_data.power_from_battery = symo.Body.Data.Site.P_Akku;
        pv_data.power_from_grid = symo.Body.Data.Site.P_Grid;
        pv_data.power_usage = pv_data.power_from_pv + powermeter.Body.Data.PowerReal_P_Sum + pv_data.power_from_battery; // needs to be checked when battery is online
        console.log(pv_data);
      }
    } catch (error) {
        console.error('ERROR:',error);
    } finally {
      schedule_lock = false;
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
