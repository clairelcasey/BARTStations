// const mapFrameGeoJSON = JSON.parse(`{"type":"Feature","geometry":{"type":"LineString","coordinates":[[-122.54644297642132,37.989209933976475],[-121.74157680240731,37.19360698897229]]}}`);

// const width = 612;
// const height = 792;

// const projection = d3.geoConicConformal()
//   .parallels([37 + 4 / 60, 38 + 26 / 60])
//   .rotate([120 + 30 / 60], 0)
//   .fitSize([width, height], mapFrameGeoJSON)

//   function getMapFrameSpec() {
//     const spec = {
//       width: 334,
//       height: 432,
//       upperLeft: [403, 561]
//     }

//     spec.bottomRight = [spec.upperLeft[0] + spec.width, spec.upperLeft[1] + spec.height]

//     return spec
//   }

//   const mapFrameSpec = getMapFrameSpec();

//   const mapFrameCoords = [
//     projection.invert(mapFrameSpec.upperLeft),
//     projection.invert(mapFrameSpec.bottomRight)
//   ]

//   console.log(mapFrameCoords, "mapFrameCoords");


const margin = { top: 50, left: 50, right: 50, bottom: 50 };
const height = 400 - margin.top - margin.bottom;
const width = 400 - margin.left - margin.right;

const svg = d3.select('#map')
  .append("svg")
  .attr("height", 640)//height + margin.top + margin.bottom)
  .attr("width", 640)//width + margin.left + margin.right)
  // .append("g")
  // .attr("transform", `translate(${margin.left},${margin.top})`);

const projection = d3.geoMercator()
  .center([-122, 37.7749])
  .scale(40000)
  .translate([320, 320])

const path = d3.geoPath()
  .projection(projection);

const g = svg.append("g");

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

g.selectAll("BART-circles")
  .data(STATIONS)
  .enter()
  .append("circle")
  .attr("r", 2)



// function ready(error, data) {
//   console.log(data);
// }