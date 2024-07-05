// script that has functions that will convert data coming from the backend to
// a format that visx charts can consume

// backend charts are python functions that take in the following parameters
// async def boxplot(
// full_data: pd.DataFrame,
// boxplot_cols: db_column_list_type_creator(1, 2),
// facet: bool = False,
// facet_col: DBColumn = None,
// color:
// opacity

//

import {
  interpolateBlues,
  interpolateBrBG,
  interpolateBuGn,
  interpolateBuPu,
  interpolateCividis,
  interpolateGnBu,
  interpolateGreens,
  interpolateGreys,
  interpolateInferno,
  interpolateMagma,
  interpolateOrRd,
  interpolateOranges,
  interpolatePRGn,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePuBu,
  interpolatePuBuGn,
  interpolateTurbo,
  interpolateViridis,
  interpolatePuOr,
  interpolatePuRd,
  interpolatePurples,
  interpolateRdBu,
  interpolateRdGy,
  interpolateRdPu,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateReds,
  interpolateSpectral,
  interpolateYlGn,
  interpolateYlGnBu,
  interpolateYlOrBr,
  interpolateYlOrRd,
  interpolateRainbow,
  interpolateWarm,
  interpolateCool,
  interpolateCubehelixDefault,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
  schemePastel1,
  schemePastel2,
  schemeGreys,
  schemePaired,
  schemeCategory10,
} from "d3-scale-chromatic";

import { scaleBand, scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { group, mean, median, max, min, sum } from "d3-array";
import { flatGroup } from "d3";

// Helper function to get the appropriate D3 aggregation function
function getAggregateFunction(type) {
  switch (type) {
    case "mean":
      return mean;
    case "median":
      return median;
    case "max":
      return max;
    case "min":
      return min;
    case "sum":
      return sum;
    default:
      return null;
  }
}

// colType
// numeric
// sorter
// title
// variableType

export function createScaleBasedOnColumnType({
  columnType,
  rows,
  valAccessor = (d) => d,
  range,
  padding = 0.2,
}) {
  // if quantitative, return scaleLinear
  // if categorical, return scaleBand
  if (columnType === "quantitative") {
    const domain = extent(rows, valAccessor);
    return scaleLinear().domain(domain).range(range);
  } else if (columnType === "categorical") {
    return scaleBand()
      .domain(Array.from(new Set(rows.map(valAccessor))))
      .padding(padding)
      .range(range);
  }

  // if neither throw error
  throw new Error(`Unsupported column type: ${columnType}`);
}

export function aggregateData({
  data,
  // keys is an object that contains the keys to group by
  // example: {x: "xCol", y: "yCol", facet: "facetCol", group: "groupCol"}...
  groupByKeys = {},
  valueAccessor = (d) => d,
  aggregationType = null,
}) {
  const keyNames = Object.keys(groupByKeys);

  const keyAccessors = keyNames.filter((d) => d).map((k) => (d) => d[k]);

  // Group data by x and y keys and facet key
  const groupedData = flatGroup(data, ...keyAccessors);

  // Aggregate values based on the specified aggregation type
  const aggregateFunction = getAggregateFunction(aggregationType);

  const aggregatedData = groupedData.map((group) => {
    // flatGroup has the format: [key1, key2, key3,..., keyN, values]
    const values = group.slice(-1)[0];

    // create an object with keyName: keyValue pairs
    const keyValues = keyNames.reduce((acc, key, i) => {
      if (key) {
        acc[key] = group[i];
      }
      return acc;
    }, {});

    let aggregated = null;

    if (aggregateFunction) {
      aggregated = aggregateFunction(values.map(valueAccessor));
    } else {
      aggregated = values.map(valueAccessor);
    }

    return {
      ...keyValues,
      value: aggregated,
      values,
    };
  });

  return aggregatedData;
}

export const mapToObject = (
  map = new Map(),
  parentNestLocation = [],
  processValue = (d) => d,
  // hook will allow you to do extra computation on every recursive call to this function
  hook = (...args) => {}
) =>
  Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => {
      // also store nestLocation for all of the deepest children
      value.nestLocation = parentNestLocation.slice();
      value.nestLocation.push(key);
      hook(key, value);

      return value instanceof Map
        ? [key, mapToObject(value, value.nestLocation, processValue)]
        : [key, processValue(value)];
    })
  );

// parse the width/height passed to a chart
export const parseChartDim = (dim) => {
  // if it's a number, treat it as pixels
  // if string, return as is

  if (typeof dim === "number") {
    return `${dim}px`;
  }
  return dim;
};

export const mplColorsToD3 = {
  magma: interpolateMagma,
  inferno: interpolateInferno,
  plasma: interpolatePlasma,
  viridis: interpolateViridis,
  cividis: interpolateCividis,
  turbo: interpolateTurbo,
  Blues: interpolateBlues,
  BrBG: interpolateBrBG,
  BuGn: interpolateBuGn,
  BuPu: interpolateBuPu,
  GnBu: interpolateGnBu,
  Greens: interpolateGreens,
  Greys: interpolateGreys,
  OrRd: interpolateOrRd,
  Oranges: interpolateOranges,
  PRGn: interpolatePRGn,
  PiYG: interpolatePiYG,
  PuBu: interpolatePuBu,
  PuBuGn: interpolatePuBuGn,
  PuOr: interpolatePuOr,
  PuRd: interpolatePuRd,
  Purples: interpolatePurples,
  RdBu: interpolateRdBu,
  RdGy: interpolateRdGy,
  RdPu: interpolateRdPu,
  RdYlBu: interpolateRdYlBu,
  RdYlGn: interpolateRdYlGn,
  Reds: interpolateReds,
  Spectral: interpolateSpectral,
  YlGn: interpolateYlGn,
  YlGnBu: interpolateYlGnBu,
  YlOrBr: interpolateYlOrBr,
  YlOrRd: interpolateYlOrRd,
  cool: interpolateCool,
  coolwarm: interpolateWarm,
  rainbow: interpolateRainbow,
  afmhot: null,
  autumn: null,
  binary: null,
  bone: null,
  brg: null,
  bwr: null,
  copper: null,
  cubehelix: interpolateCubehelixDefault,
  flag: null,
  gist_earth: null,
  gist_gray: null,
  gist_heat: null,
  gist_ncar: null,
  gist_rainbow: null,
  gist_stern: null,
  gist_yarg: null,
  gnuplot: null,
  gnuplot2: null,
  gray: schemeGreys,
  hot: null,
  hsv: null,
  jet: null,
  nipy_spectral: null,
  ocean: null,
  pink: null,
  prism: null,
  seismic: null,
  spring: null,
  summer: null,
  terrain: null,
  winter: null,
  Accent: null,
  Dark2: null,
  Paired: schemePaired,
  Pastel1: schemePastel1,
  Pastel2: schemePastel2,
  Set1: schemeSet1,
  Set2: schemeSet2,
  Set3: schemeSet3,
  tab10: schemeTableau10,
  tab20: schemeTableau10,
  schemeCategory10: schemeCategory10,
};
