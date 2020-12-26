"use strict";

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
    newSta.etd = newEtd;
    return newSta;
  })
  CurStationsData = stationsFiltered;
  return stationsFiltered
}


/* Given a color and direction, filter data based on parameters. */

function filterByColorAndDirection(color, dirName) {
  const stationsFiltered = STATIONS.map(function (val) {
    let newVal = JSON.parse(JSON.stringify(val));
    for (let elem of newVal.etd) {
      if (elem.estimate[0].color === color && elem.abbreviation === dirName) {
        newVal.show = true;
        newVal.etd = [elem];
        return newVal;
      }
    }
    newVal.show = false;
    return newVal;
  })
  CurStationsData = stationsFiltered;
  return stationsFiltered
}
