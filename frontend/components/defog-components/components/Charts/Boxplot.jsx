import React, { useState, useEffect, useRef } from "react";
import {
  aggregateData,
  createScaleBasedOnColumnType,
  mplColorsToD3,
  parseChartDim,
} from "./utils";

/**
 * Creates boxplots
 * @component
 * @param {Object} props
 * @param {Array} props.columns - Array of column objects we get after passing a column through inferColumnType
 * @param {Array} props.rows - Array of data objects. each object is a row in the dataset
 * @param {string}props.xCol - Column name to use for x-axis
 * @param {string} props.yCol - Column name to use for y-axis
 * @param {boolean} props.facet - Whether to facet the boxplots. Default is false.
 * @param {string} props.facetCol - Column name to use for facetting
 * @param {string} props.color - Color of the boxplot. Default is "#000000".
 * @param {number} props.opacity - Opacity of the boxplot. Default is 0.3.
 *
 * @returns {React.Component}
 */
export default function Boxplot({
  rows,
  columns,
  xCol,
  yCol,
  facet = false,
  facetCol,
  color = "#000000",
  opacity = 0.3,
}) {
  const [processedData, setProcessedData] = useState([]);
  const ctr = useRef(null);

  useEffect(() => {
    // Process data based on aggregationType
    const aggregatedData = aggregateData({
      data: rows,
      groupByKeys: {
        x: xCol,
        y: yCol,
      },
      valueAccessor: (d) => d[yCol],
      aggregationType: null,
    });
    setProcessedData(aggregatedData);
  }, [rows, xCol, yCol]);

  console.log(processedData);

  return <div>Boxplot</div>;
}
