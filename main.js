"use strict";


/* Get list of stations, and for each station get list of future departure 
times */

// potentially refactor: need to use let because re-binding in 
// getStationsAndDisplay. Want to keep as global constant, but do easy filter.
let STATIONS = [];
// TO DO: make a current stations data variable and reset this with filtered
let CurStationsData = [];

async function getStationsAndDisplay() {
  STATIONS = await getStationIds();
  for (let station of STATIONS) {
    station.etd = await getDepartureTimes(station.abbr);
    station.show = true;
  }
  // only get stations where there are ETDs
  STATIONS = STATIONS.filter((val) => val.etd);
  $loading.hide();
  const times = await getMostRecentUpdateTime();
  displayTimeAndOptions(times);
  createMap();
  CurStationsData = STATIONS;
}

$(getStationsAndDisplay);


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
const mapDat = svg.append("g");
const BARTDat = svg.append("g");
const circles = svg.append("g");

/* Create a zoomed function for when map is zoomed in/out */

function zoomed({ transform, d }) {
  mapDat.attr("transform", transform);
  circles.attr("transform", transform);
  BARTDat.attr("transform", transform);
}

const projection = d3.geoMercator()
  .center([-122.2, 37.7])
  .scale(40000)
  .translate([320, 320])

const path = d3.geoPath()
  .projection(projection);


/* Create county outlines and BART circles. 
* Wait to create map until the stations have been selected */
function createMap() {

  d3.json("california-counties@1.topojson").then(function (topology) {

    mapDat.selectAll(".county")
      .data(topojson.feature(topology, topology.objects.counties).features)
      .enter()
      .append("path")
      .attr("class", "county")
      .attr("d", path)
      .attr("fill", "grey");
  });

  d3.json("BART_System_2020.topojson").then(function (topology) {

    BARTDat.selectAll(".BART_System")
      .data(topojson.feature(topology, topology.objects.BART_System_2020).features)
      .enter()
      .append("path")
      .attr("class", "BART_System")
      .attr("d", path)
      .attr("stroke", "darkgrey")
      .attr("fill", "none");

  });

  // Create the circles
  // REFACTOR OPTION: Can some of these if statements/ callbacks be separate 
  //fns?
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
      // Potential refactor: move some styling to class in CSS?
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
      d3.select('#tooltip')
        .style("opacity", "0")
        .style("display", "none");
    })
}



/* Add event listener to display click */
let showDelay = false;
$("#delayCheck").on("click", function(evt) {
  showDelay = (showDelay) ? false : true;
  updateDelay();
  $(this).text(function(i, text) {
    return text === "Display Delays: On" ? "Display Delays: Off" : "Display Delays: On";
  })
});

/* If the delay button is clicked, turn on and off strokes around the circles 
with delays.
* This function will show any station that has a delay (does not matter if 
only certain lines are showing). */

function updateDelay() {

  if (showDelay) {
    d3.selectAll(".BART-circles")
      .data(CurStationsData)
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
  updateDelay();
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





$("#resetBtn").on("click", resetMap);

/* Reset the map styles when reset button is clicked. */

function resetMap() {
  CurStationsData = STATIONS;
  d3.selectAll(".BART-circles")
    .data(STATIONS)
    .style("fill", "blue")
    .style("opacity", 0.4)
    .style("r", 5)
    .style("display", "block");
  updateDelay();
}


/* If a user clicks on button to display stations by wait, get the 
color and name they clicked on and run UpdateLineByWait function.*/

$("#BART-lines-by-wait").on("click", ".dropdown-item", function (evt) {
  const $button = $(evt.target);
  const info = $button.attr("id").split('-');

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
      return d.etd[0].estimate[0].minutes;
    });
}

