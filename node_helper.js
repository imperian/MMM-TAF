/* Magic Mirror
 * Module: TAF
 * 
 * 
 * Based on aviationwx by Stuart Loh https://github.com/stuloh
 * Modified 2019
 *
 * Licensed under Apache v2 license
 */

var NodeHelper = require("node_helper");
var request = require("request");

module.exports = NodeHelper.create({
  start: function () {
    console.log("MMM-TAF helper started ...");
  },

  getTAF: function (payload) {
    console.log("--Aviation TAF: Fetching TAF Data--");
    var self = this;
    // [airports, metarUrl, FAAUrl] = payload;
    var airports = payload[0].split(",");
    var METARUrl = payload[1];
    var TAFUrl = payload[2];
    var airportData = new Object();

    // Convert to US ICAO codes
    airports = airports.map(function(airport) {
      airport = airport.trim();
      return (airport.length < 4) ? "K" + airport : airport;
    });
    
    // Track number of HTTP requests to be made
    var numAirports = airports.length * 2;

    airports.forEach(function(airport, index) {
      airportData[airport] = new Object();
      var METARCheckUrl = METARUrl.replace("<IATA_CODE>", airport);
      console.log("Checking URL: " + METARCheckUrl);
      request({url: METARCheckUrl, method: "GET"}, function (err, rsp, bod) {
        if (!err && rsp.statusCode == 200)
        {
          airportData[airport]["METAR"] = JSON.parse(bod);
        } else {
          console.log("Error fetching METAR data for " + airport + ": " + 
                  err + " (HTTP status: " + rsp.statusCode + ")");
        }
        numAirports--;
        console.log("Airports remaining: " + numAirports);
        if (numAirports == 0) {
          self.sendSocketNotification("TAF_RESULT", airportData);
          console.log("Socket notification sent.");
        }
      });

      var TAFCheckUrl = TAFUrl.replace("<IATA_CODE>", airport);
      console.log("Checking URL: " + TAFCheckUrl);
      request({url: TAFCheckUrl, method: "GET"}, function (err, rsp, bod) {
        if (!err && rsp.statusCode == 200)
        {
          airportData[airport]["TAF"] = JSON.parse(bod);
        } else {
          console.log("Error fetching TAF data for " + airport + ": " + 
                  err + " (HTTP status: " + rsp.statusCode + ")");
        }
        numAirports--;
        console.log("Airports remaining: " + numAirports);
        if (numAirports == 0) {
          self.sendSocketNotification("TAF_RESULT", airportData);
          console.log("Socket notification sent.");
        }
      });
    });
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    console.log("Notification: " + notification);
    if (notification === "GET_TAF") {
      this.getTAF(payload);
    }
  }

});

