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
  // console.log(response.data.root);
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
  STATIONS = STATIONS.filter((val) => val.etd);
  console.log('final stations', STATIONS);
  $loading.hide();
  const times = await getMostRecentUpdateTime();
  // console.log('times', times);
  displayTimeAndOptions(times);
  createMap();
}

$(getStationsAndDisplay);
// $(createMap);

/* Given time from GET request, display time in header */

function displayTimeAndOptions(times) {
  const $time = $("<h3>")
    .attr("id", "time")
    .attr("class", "text-muted")
    .text(`Most Recent Update: ${times.date} at ${times.time}`);
  $("#time-option-container").prepend($time);

  $("#time-option-container").show();
}

/* Initialize d3 elements */

const svg = d3.select('#map')
  .append("svg")
  .attr("height", 640)//height + margin.top + margin.bottom)
  .attr("width", 640);

/* Add zoom feature on svg */
svg.call(d3.zoom()
  .extent([[0, 0], [640, 640]])
  .scaleExtent([1, 8])
  .on("zoom", zoomed));//width + margin.left + margin.right)


/* Initialize 2gs = first "g' will hold map paths; circles will hold BART 
station circles */
const g = svg.append("g");
const circles = svg.append("g")

function zoomed({ transform, d }) {
  g.attr("transform", transform);
  circles.attr("transform", transform);
}

const projection = d3.geoMercator()
  .center([-122.4194, 37.7749])
  .scale(45000)
  .translate([320, 320])

const path = d3.geoPath()
  .projection(projection);


/* Create county outlines and BART circles. 
* Wait to create map until the stations have been selected */
function createMap() {

  d3.json("california-counties@1.topojson").then(function (topology) {
    // console.log(topology);

    g.selectAll(".county")
      .data(topojson.feature(topology, topology.objects.counties).features)
      .enter()
      .append("path")
      .attr("class", "county")
      .attr("d", path)
      .attr("fill", "grey");
  });

  // Create the circles
  circles.selectAll("BART-circles")
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
        // update tooltip
      d3.select('#name').text(`${d.name} Station`);
      for (let sta of d.etd) {
        d3.select("#etd")
          .append("span")
          .style("color", sta.estimate[0].color)
          .text(sta.estimate[0].color)
          .append("span")
          .style("color", "black")
          .attr('class', 'single-etd')
          .text(` train to ${sta.destination} in ${sta.estimate[0].minutes} 
          minutes`);
        // If there is a delay, display the delay in the tooltip in red
        if (sta.estimate[0].delay !== "0") {
          d3.select("#etd")
            .append("span")
            .style("color", "red")
            .text(` (delayed ${sta.estimate[0].delay} minutes)`)
        }
        d3.select("#etd").append('br');
      }
      // display tooltip based on the mouseover event
      d3.select('#tooltip')
        .style("opacity", "0.8")
        .style("display", "block")
        .style("left", (evt.pageX + 20) + "px")
        .style("top", (evt.pageY - 20) + "px");
    })
    // add mouseout event
    .on('mouseout', function (evt, d) {
      $("#etd").empty();
      d3.select(this)
        .style('opacity', '0.4')
      // .style('r', 5);
      d3.select('#tooltip')
        .style("opacity", "0")
        .style("display", "none");
    })
}



/* Add checkbox updates */
let showDelay = false;
$("#delayCheck").on("click", updateDelay);

/* If the delay button is clicked, turn on and off strokes around the circles 
with delays.
* This function will show any station that has a delay (does not matter if 
only certain lines are showing). */

function updateDelay() {
  showDelay = (showDelay) ? false : true;
  if (showDelay) {
    d3.selectAll(".BART-circles")
      .data(STATIONS)
      .style("stroke", function (d) {
        return (d.etd.every(val => val.estimate[0].delay === "0")) ? "none" : "red"
      })
  } else {
    d3.selectAll(".BART-circles")
      .data(STATIONS)
      .style("stroke", "none")
  }
}



/* If a user clicks only to show a specific line, get the color they clicked 
and update the map to just show that Line. */

$("#BART-lines").on("click", ".dropdown-item", function (evt) {
  const $button = $(evt.target);
  const color = $button.attr("id");
  updateLine(color);
})

/* Given a color, only show BART circles that are on that line (tooltip is not 
  updated so info on all lines will still show) */

function updateLine(color) {
  const lineDataUpdate = filterByColor(color);
  d3.selectAll(".BART-circles")
    .data(lineDataUpdate)
    .style("fill", color)
    .style("r", 5)
    .style("display", function (d) {
      return (d.show) ? "block" : "none"
    });
}


/* Given a color, update the data to have a "show" element that is true if the 
BART station is on that Line and false if not. 
* This uses map rather than filter so that the elements aren't actually 
removed, just not displayed. 
This is so the tooltip information and mouse clicks don't need to be re-added. 
*/

function filterByColor(color) {
  const stationsFiltered = STATIONS.map(function (sta) {
    let newSta = JSON.parse(JSON.stringify(sta));
    let newEtd = [];
    let showing = null;
    for (let destination of newSta.etd) {
      // console.log('destination', destination);
      // push the destination if it's on the correct line. Using push because 
      // there are trains going in both directions that share the same color. 
      if (destination.estimate[0].color === color) {
        showing = true;
        newEtd.push(destination);
      }
    }
    // if showing is still null (for this station, there are no trains 
    // on the line with this color, then set showing to false)
    if (showing === null) showing = false;
    newSta.show = showing;
    // console.log('newETD', newEtd);
    newSta.etd = newEtd;
    // console.log('newSta', newSta);
    return newSta;
  })
  console.log(stationsFiltered, 'filtered by color');
  return stationsFiltered
}


$("#resetBtn").on("click", resetMap);

/* Reset the map styles when reset button is clicked. */

function resetMap() {
  d3.selectAll(".BART-circles")
    .data(STATIONS)
    .style("fill", "blue")
    .style("opacity", 0.4)
    .style("r", 5)
    .style("display", "block");
}


/* If a user clicks on button to display stations by wait, get the 
color and name they clicked on and run UpdateLineByWait function.*/

$("#BART-lines-by-wait").on("click", ".dropdown-item", function (evt) {
  const $button = $(evt.target);
  const info = $button.attr("id").split('-');
  // console.log('info', info);

  const color = info[0];//$button.attr("id");
  const name = info[1];
  updateLineByWait(color, name);
})

/* Given a color and direction, get updated data and update styles/ display for 
BART circles */

function updateLineByWait(color, dirName) {
  const lineDataUpdate = filterByColorAndDirection(color, dirName);
  d3.selectAll(".BART-circles")
    .data(lineDataUpdate)
    .style("fill", color)
    .style("display", function (d) {
      return (d.show) ? "block" : "none"
    })
    .style("r", function (d) {
      if (d.etd[0].estimate[0].minutes === "Leaving") return 2;
      // console.log(d.etd[0].estimate[0].minutes,"d");
      return d.etd[0].estimate[0].minutes;
    });
}

/* Given a color and direction, filter data based on parameters. */

function filterByColorAndDirection(color, dirName) {
  const stationsFiltered = STATIONS.map(function (val) {
    let newVal = JSON.parse(JSON.stringify(val));
    for (let elem of newVal.etd) {
      // console.log('elem', elem);
      if (elem.estimate[0].color === color && elem.abbreviation === dirName) {
        newVal.show = true;
        newVal.etd = [elem];
        return newVal;
      }
    }
    newVal.show = false;
    return newVal;
  })
  console.log(stationsFiltered, 'filtered by color and direction');
  return stationsFiltered
}