"use strict";

const BASE_API_URL = "http://api.bart.gov/api";
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
  console.log(response.data.root);
  return {
    date: response.data.root.date,
    time: response.data.root.time
  }
}

/* Get list of stations, and for each station get list of future departure 
times */
let STATIONS = [];

async function getStationsAndDisplay() {
  STATIONS = await getStationIds();
  for (let station of STATIONS) {
    station.etd = await getDepartureTimes(station.abbr);
  }
  // only get stations where there are ETDs
  STATIONS = STATIONS.filter( (val) => val.etd);
  console.log('final stations', STATIONS);
  $loading.hide();
  const times = await getMostRecentUpdateTime();
  console.log('times',times);
  displayTime(times);
  createMap();
}

$(getStationsAndDisplay);
// $(createMap);


function displayTime(times) {
  const $time = $("<h3>")
  .attr("id","time")
  .attr("class", "text-muted")
  .text(`Most Recent Update: ${times.date} at ${times.time}`);
  $("#title").append($time);
}






const svg = d3.select('#map')
  .append("svg")
  .attr("height", 640)//height + margin.top + margin.bottom)
  .attr("width", 640)//width + margin.left + margin.right)
// .append("g")
// .attr("transform", `translate(${margin.left},${margin.top})`);

const projection = d3.geoMercator()
  .center([-122.4194, 37.7749])
  .scale(45000)
  .translate([320, 320])

const path = d3.geoPath()
  .projection(projection);

const g = svg.append("g");



/* Wait to create map until the stations have been selected */
function createMap() {

  d3.json("california-counties@1.topojson").then(function (topology) {
    console.log(topology);

    g.selectAll(".county")
      .data(topojson.feature(topology, topology.objects.counties).features)
      .enter()
      .append("path")
      .attr("class", "county")
      .attr("d", path)
      .attr("fill", "grey");
  });

  svg.selectAll("BART-circles")
    .data(STATIONS)
    .enter()
    .append("circle")
    .attr('class', 'BART-circles')
    .attr("r", 5)
    .attr("cx", function (d) {
      const coords = projection([d.gtfs_longitude, d.gtfs_latitude]);
      return coords[0];
    })
    .attr("cy", function (d) {
      const coords = projection([d.gtfs_longitude, d.gtfs_latitude]);
      return coords[1];
    })
    .attr("fill", "blue")
    .on('mouseover', function (evt, d) {
      d3.select(this)
        .style('opacity', '1')
        .attr("r", 6);
      d3.select('#name').text(d.name);
      for (let sta of d.etd) {
        d3.select("#etd")
          .append("span")
          .style("color", sta.estimate[0].color)
          .text(sta.estimate[0].color)
          .append("span")
          .style("color", "black")
          .attr('class', 'single-etd')
          .text(` train to ${sta.destination} in ${sta.estimate[0].minutes} minutes`)
          .append('br')
      }
      d3.select('#tooltip')
        .style("opacity", "0.8")
        .style("display", "block")
        .style("left", (evt.pageX + 20) + "px")
        .style("top", (evt.pageY - 20) + "px");
    })
    .on('mouseout', function (evt, d) {
      console.log(this)
      $("#etd").empty();
      d3.select(this)
        .style('opacity', '0.4')
        .style('r', 5);
      d3.select('#tooltip')
        .style("opacity", "0")
        .style("display", "none");
    })
}