"use strict";

const BASE_API_URL = "http://api.bart.gov/api";
// public example key used by BART. To get your own key, go to: 
// http://api.bart.gov/api/register.aspx
const KEY = "MW9S-E7SL-26DU-VV8V"


/* Make a request and return array of BART station data in format: 
[
  {
    name: "12th Street',
    abbr: "12TH",
    gtfs_latitude: "37.0343",
    stfs_longitude: "-122.3434",
    address: "1245 Broadway, Oakland"
  }
  ....
]
*/
async function getStationIds() {
  const response = await axios({
    url: `${BASE_API_URL}/stn.aspx`,
    method: "GET",
    params: {
      cmd: "stns",
      json: "y",
      key: KEY
    },
  });
  const stations = response.data.root.stations.station;
  // console.log('stations', stations);
  return stations;
}
const $loading = $('#Loading');


/* Given a station abbreviation, return array of estimated time of departures: 
[
  {
    destination: "Antioch',
    abbr: "ANTC",
    limited: "0",
    estimate: [
      {
        minutes: "4",
        platform: "1",
        direction: "North",
        length: "10",
        color: "YELLOW"
      }
      ....
    ]
    gtfs_latitude: "37.0343",
    stfs_longitude: "-122.3434",
    address: "1245 Broadway, Oakland"
  }, 

    {
    destination: "SF Airport',
    abbr: "SFIA",
    limited: "0",
    estimate: [
      {
        minutes: "10",
        platform: "1",
        direction: "South",
        length: "10",
        color: "YELLOW"
      }
      ....
    ]
  }
  ....
]
*/
async function getDepartureTimes(abbr) {
  const response = await axios({
    url: `${BASE_API_URL}/etd.aspx`,
    method: "GET",
    params: {
      cmd: "etd",
      orig: abbr,
      key: KEY,
      json: "y"
    },
  });
  return response.data.root.station[0].etd;
}

/* Get time of most recent update (the same for all, so it just takes the first 
  time) */

async function getMostRecentUpdateTime() {
  const response = await axios({
    url: `${BASE_API_URL}/etd.aspx`,
    method: "GET",
    params: {
      cmd: "etd",
      orig: "12TH",
      key: KEY,
      json: "y"
    },
  });
  // console.log(response.data.root);
  return {
    date: response.data.root.date,
    time: response.data.root.time
  }
}
