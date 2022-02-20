/* 
 * TAF Module for MagicMirror2 (MMM-TAF)
 *
 * Based on Aviation Weather Module for MagicMirror2 (MMM-aviationwx)
 * - Displays weather from METAR/TAF reports
 * - Uses avwx.rest for data and includes more data location (including int'l)
 *
 *
 * Modified Copyright 2019 Licensed under Apache License, Version 2.0
 *
 * Original Copyright 2017 Stuart Loh (www.hearye.org)
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

Module.register("MMM-TAF", {

  // Initialize var for storing data
  tafdata: [],
  
  // Default module configuration variables
  defaults: {
    airports: "KPHL,EGLL", // Do not use IATA codes for non-US airports. Use ICAO.
    airports: "KSFO,PAO,HAF,JFK", // continental U.S. airports only
    updateInterval: 10, // in minutes
    fadeSpeed: 100,
  },

  getScripts: function() {
    return ["moment.js"];
  },

  getStyles: function() {
    return ["MMM-TAF.css"];
  },

  // Entry point for module
  start: function() { 
    this.getTAF();
    this.scheduleUpdate();
  },

  // Override dom generator
  getDom: function() {
    var wrapper = document.createElement("div");
    wrapper.className = "medium";

    // Create table element
    var table = document.createElement("table");
    table.classList.add("xsmall", "table");

    // Create header row
    var headerRow = document.createElement("tr");
    var statusH = document.createElement("th");
    statusH.innerHTML = " ";
    headerRow.appendChild(statusH);
    var airportH = document.createElement("th");
    airportH.innerHTML = "Airport";
    headerRow.appendChild(airportH);
    var wxH = document.createElement("th");
    wxH.className = "left-align";
    wxH.innerHTML = "Weather";
    headerRow.appendChild(wxH);
    table.appendChild(headerRow);

    // Abort if no wx data received
    if (this.tafdata.length < 1) return wrapper;
    // Format data for each airport
    var airportList = this.config.airports.split(",");
    airportList = airportList.map(function (ap) { return ap.trim(); });

    var notFound = "";
    for (var i = 0; i < airportList.length; i++) {
      var airportKey = (airportList[i].length === 3) ? "K" + airportList[i] : airportList[i];

      if (!(airportKey in this.tafdata)) {
        if (airportKey) notFound += airportKey + " ";
        console.log("Error: " + airportKey + " data not found. " +
                    "Check correct code, or airport has stopped reporting METAR for the day.");
        continue;
      }
      if ("error" in this.tafdata[airportKey]["METAR"]) {
        console.log("Error: " + this.tafdata[airportKey]["METAR"]["error"]);
        continue;
      }



      // Create Table Row
      var row = document.createElement("tr");
      row.classList.add("small", "top-align");
      if ( i > 0 ) row.classList.add("additional-airport");

      var airport = this.tafdata[airportKey]["METAR"]
      // Show Flight Category (VFR, MVFR, IFR, LIFR)
      var fltcat = airport["flight_rules"];
      var statusCell = document.createElement("td");
      statusCell.className = "bright";
      var statusSpan = document.createElement("span");
      statusSpan.className = fltcat.toLowerCase();
      statusSpan.setAttribute("title", fltcat);
      statusSpan.innerHTML = "&#9673;"
      statusCell.appendChild(statusSpan);
      row.appendChild(statusCell);

      // Show Airport Name and any delays
      var name = airport["station"];
      var nameCell = document.createElement("td");
      nameCell.className = "bright nodec left-align";
      var tafUrl = "https://aviationweather.gov/taf/data?ids=" + name + "&format=decoded&metars=on&layout=on";
      nameCell.innerHTML = this.wrapInLink(name, tafUrl) + "&nbsp;";
      nameCell.setAttribute("title", name + " Airport");
      row.appendChild(nameCell);
      var today = new Date();
      // Show WX
      var obsTime = airport.time.dt;
      obsTime = obsTime.replace("Z", " +0000");
      obsTime = obsTime.replace("T", " ");
      var obsTimeMoment = moment(obsTime, "YYYY-MM-DD HH:mm ZZ").local();
      var summary = airport.summary;
      var wxCell = document.createElement("td");
      wxCell.className = "xsmall bottom-align left-align";
      wxCell.setAttribute("title", airport["raw"]);
      wxCell.innerHTML = "<b>" + summary + "</b> " +
                         obsTimeMoment.format("[(]HH:mm[)]");
      row.appendChild(wxCell);

      // Append row
      table.appendChild(row);

      // TAF Data
      //
      if (!("TAF" in this.tafdata[airportKey])) {
        console.log("Error: " + airportKey + " TAF data not found. " +
                    "Check correct code, or airport has stopped reporting TAF for the day.");
        if ( (i+1) < airportList.length ) row.classList.add("last-TAF");
        continue;
      }
      var airport = this.tafdata[airportKey]["TAF"];
      if ("forecast" in this.tafdata[airportKey]["TAF"])
      {
        this.tafdata[airportKey]["TAF"]["forecast"].forEach( function (item, index) {
          
          // Create Table Row
          row = document.createElement("tr");
          row.classList.add("small", "top-align");

          // Show Flight Category (VFR, MVFR, IFR, LIFR)
          var fltcat = item["flight_rules"];
          var statusCell = document.createElement("td");
          statusCell.className = "bright";
          var statusSpan = document.createElement("span");
          statusSpan.className = fltcat.toLowerCase();
          statusSpan.setAttribute("title", fltcat);
          statusSpan.innerHTML = "&#9673;"
          statusCell.appendChild(statusSpan);
          row.appendChild(statusCell);

          // Show From Time
          var fromTime = item["start_time"]["repr"];
          var fromDay = fromTime.slice(0,2);
          var fromHour = fromTime.slice(2,4);
          var today = new Date();
          var obsTime = item["start_time"]["dt"];
          obsTime = obsTime.replace("Z", " +0000");
          obsTime = obsTime.replace("T", " ");

          var obsTimeMoment = moment(obsTime, "YYYY-MM-DD HH:mm ZZ").local();
          console.log("Time: " + fromTime + " ObsTime: " + obsTime + " Local Time: " + obsTimeMoment.format("HH:mm"));

          var timeCell = document.createElement("td");
          timeCell.className = "bright nodec left-align";
          timeCell.innerHTML = obsTimeMoment.format("[(]HH:mm[)]") + "&nbsp;";
          row.appendChild(timeCell);
      
          var wxCell = document.createElement("td");
          wxCell.className = "xsmall bottom-align left-align";
          wxCell.innerHTML = item["summary"];
          
          row.appendChild(wxCell);

          table.appendChild(row);
        });
      }
      if ( (i+1) < airportList.length ) row.classList.add("last-TAF");
    }

    // Identify any airports for which data was not retrieved
    if (notFound) {
      var errorRow = document.createElement("tr");
      errorRow.className = "xsmall dimmer";
      var errorCell = document.createElement("td");
      errorCell.setAttribute("colSpan", "3");
      errorCell.innerHTML = "<i>No data for " + notFound + " (may not be reporting)</i>";
      errorRow.appendChild(errorCell);
      table.appendChild(errorRow);
      notFound = "";
    }
    
    wrapper.appendChild(table);
    return wrapper;
  },

  scheduleUpdate: function(delay) {
    var nextLoad = this.config.updateInterval * 60000;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    setInterval(function() {
      self.getTAF();
    }, nextLoad);
  },

  // Helper Functions
  padZeroes: function(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  },

  wrapInLink: function(text, url) {
    return "<a href=\"" + url + "\" target=\"_blank\">" + text + "</a>";
  },

  // Data Handling Functions
  getTAF: function () {
    var metarUrl = "http://avwx.rest/api/metar/<IATA_CODE>?options=summary,translate,info&format=json&onfail=cache"; 
    var TAFUrl = "http://avwx.rest/api/taf/<IATA_CODE>?options=summary&format=json&onfail=cache"; 
    var payload = [this.config.airports, metarUrl, TAFUrl, this.config.token];
    this.sendSocketNotification("GET_TAF", payload);
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "TAF_RESULT") {
      this.tafdata = payload;
      this.updateDom(this.config.fadeSpeed);
    }    
  },
});
