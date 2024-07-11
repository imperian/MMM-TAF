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
    var Token = payload[3];
    var airportData = new Object();
    import("ky").then( ({default:ky}) => {
	const api = ky.extend({
	    hooks: {
		beforeRequest: [
		    request => {
			request.headers.set('Authorization', Token);
		    }
		]
	    }
	});

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
	    api.get(METARCheckUrl).then( (response) => {
		if (response.status == 200) {
		    response.json().then( (data) => {
			airportData[airport]["METAR"] = data;
			numAirports--;
			console.log("Airports remaining: " + numAirports);
			if (numAirports == 0) {
			    self.sendSocketNotification("TAF_RESULT", airportData);
			    console.log("Socket notification sent.");
			}
		    });
		} else {
		    console.log("Error fetching METAR data for " + airport + ": " + "{HTTP status: " + response.status + ")");
		    numAirports--;
		    console.log("Airports remaining: " + numAirports);
		    if (numAirports == 0) {
			self.sendSocketNotification("TAF_RESULT", airportData);
			console.log("Socket notification sent.");
		    }
		}
        
	    }).catch((err)=>{});

	    var TAFCheckUrl = TAFUrl.replace("<IATA_CODE>", airport);
	    console.log("Checking URL: " + TAFCheckUrl);
	    api.get(TAFCheckUrl).then( (response) => {
		if (response.status === 200)  {
		    response.json().then( (data) => {
			airportData[airport]["TAF"] = data;
			numAirports--;
			console.log("Airports remaining: " + numAirports);
			if (numAirports == 0) {
			    self.sendSocketNotification("TAF_RESULT", airportData);
			    console.log("Socket notification sent.");
			}
		    });
		} else {
		    console.log("Error fetching TAF data for " + airport + ": " + "{HTTP status: " + response.status + ")");
		    numAirports--;
		    console.log("Airports remaining: " + numAirports);
		    if (numAirports == 0) {
			self.sendSocketNotification("TAF_RESULT", airportData);
			console.log("Socket notification sent.");
		    }
		}

	    }).catch((err)=>{});
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

