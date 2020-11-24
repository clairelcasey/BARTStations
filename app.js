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
  STATIONS = STATIONS.filter((val) => val.etd);
  console.log('final stations', STATIONS);
  $loading.hide();
  const times = await getMostRecentUpdateTime();
  console.log('times', times);
  displayTimeAndOptions(times);
  createMap();
}

$(getStationsAndDisplay);
// $(createMap);


function displayTimeAndOptions(times) {
  const $time = $("<h3>")
    .attr("id", "time")
    .attr("class", "text-muted")
    .text(`Most Recent Update: ${times.date} at ${times.time}`);
  $("#time-option-container").prepend($time);

  $("#time-option-container").show();
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
          .text(` train to ${sta.destination} in ${sta.estimate[0].minutes} 
          minutes`);

        if (sta.estimate[0].delay !== "0") {
          d3.select("#etd")
            .append("span")
            .style("color", "red")
            .text(` (delayed ${sta.estimate[0].delay} minutes)`)
        }
        d3.select("#etd").append('br');
      }
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





$("#BART-lines").on("click",".dropdown-item", function(evt) {
  const $button = $(evt.target);
  const color = $button.attr("id");
  updateLine(color);
})


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



function filterByColor(color) {
  const stationsFiltered = STATIONS.map(function (val) {
    for (let destination of val.etd) {
      console.log('destination', destination);
      if (destination.estimate[0].color === color) {
        val.show = true;
        return val;
      }
    }
    val.show = false;
    return val;
  })
  console.log(stationsFiltered, 'filtered');
  return stationsFiltered
}


$("#resetBtn").on("click", resetMap);

function resetMap() {
  d3.selectAll(".BART-circles")
  .data(STATIONS)
  .style("fill", "blue")
  .style("opacity", 0.4)
  .style("r", 5)
  .style("display", "block");
}







$("#BART-lines-by-delay").on("click",".dropdown-item", function(evt) {
  const $button = $(evt.target);
  const info = $button.attr("id").split('-');
  console.log('info',info);

  const color = info[0];//$button.attr("id");
  const name = info[1];
  updateLineByDelay(color, name);
})


function updateLineByDelay(color, dirName) {
  const lineDataUpdate = filterByColorAndDirection(color, dirName);
  d3.selectAll(".BART-circles")
    .data(lineDataUpdate)
    .style("fill", color)
    .style("display", function (d) {
      return (d.show) ? "block" : "none"
    })
    .style("r", function(d) {
      if (d.etd[0].estimate[0].minutes === "Leaving") return 2;
      // console.log(d.etd[0].estimate[0].minutes,"d");
      return d.etd[0].estimate[0].minutes;
    });
}



function filterByColorAndDirection(color, dirName) {
  const stationsFiltered = STATIONS.map(function (val) {
    for (let elem of val.etd) {
      console.log('elem', elem);
      if (elem.estimate[0].color === color && elem.destination === dirName) {
        val.show = true;
        val.etd = [elem];
        return val;
      }
    }
    val.show = false;
    return val;
  })
  console.log(stationsFiltered, 'filtered');
  return stationsFiltered
}