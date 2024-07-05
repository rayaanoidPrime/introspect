import React, { useState, useEffect, useRef } from "react";
import { max } from "d3-array";
import {
  aggregateData,
  createScaleBasedOnColumnType,
  mplColorsToD3,
  parseChartDim,
} from "./utils";
import { interpolateRgbBasis } from "d3";

/**
 * Creates heatmaps
 * @component
 * @param {Object} props
 * @param {Array} props.columns - Array of column objects we get after passing a column through inferColumnType
 * @param {Array} props.rows - Array of data objects. each object is a row in the dataset
 * @param {string}props.xCol - Column name to use for x-axis
 * @param {string} props.yCol - Column name to use for y-axis
 * @param {string} props.colorCol - Column name to use for color scale
 * @param {string} props.aggregationType - Type of aggregation to use for the heatmap. Default is "mean". Cam be ["mean", "median", "max", "min", "sum"].
 * @param {string} props.colorScaleName - Name of the color scale to use. Default is "viridis". Can be any of the color scales in mplColorsToD3.
 * @param {string|number} props.width - CSS formatted width of the heatmap.
 * @param {string|number} props.height - CSS formatted height of the heatmap.
 * @param {boolean} props.labelRects - Whether to show labels on the heatmap.
 * @param {function} props.labelFilter - Filter function to determine which labels to show. This will be passed the rect's width, height, the data point and the chart container's DOM element.
 * @param {number} props.padding - Padding between heatmap cells. Default is 0.05.
 */
export default function Heatmap({
  rows,
  columns,
  xCol,
  yCol,
  colorCol,
  aggregationType = "mean",
  colorScaleName = "viridis",
  width = "full",
  height = 500,
  labelRects = true,
  labelFilter = (w, h, d, ctr) => true,
  padding = 0.05,
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
      valueAccessor: (d) => d[colorCol],
      aggregationType,
    });
    setProcessedData(aggregatedData);
  }, [rows, xCol, yCol, colorCol, aggregationType]);

  console.log(processedData);

  const colorMax = max(processedData, (d) => d.value);

  // Define scales
  const yScale = createScaleBasedOnColumnType({
    columnType: "categorical",
    rows: processedData,
    valAccessor: (d) => d.y,
    range: [100, 0],
    padding: padding,
  });

  const xScale = createScaleBasedOnColumnType({
    columnType: "categorical",
    rows: processedData,
    valAccessor: (d) => d.x,
    range: [0, 100],
    padding: padding,
  });

  let colorScale = mplColorsToD3[colorScaleName] || mplColorsToD3["viridis"];

  if (typeof colorScale !== "function") {
    colorScale = interpolateRgbBasis(colorScale);
  }

  return (
    <div
      className="relative bg-white p-2"
      ref={ctr}
      style={{
        width: parseChartDim(width),
        height: parseChartDim(height),
      }}
    >
      <div className="flex flex-row w-full h-full ">
        <div className="flex flex-col basis-0 w-28">
          {/* the y axis */}
          <div className="relative grow">
            {yScale.domain().map((d, i) => (
              <div
                className="absolute text-center w-full flex items-center justify-center"
                key={i}
                style={{
                  height: `${yScale.bandwidth()}%`,
                  top: `${yScale(d)}%`,
                }}
              >
                <p className="whitespace-nowrap text-ellipsis overflow-hidden">
                  {d}
                </p>
              </div>
            ))}
          </div>
          {/* this to offset the x axis (which is the next "row" of this flexbox) so that it aligns with the chart */}
          <div className="w-40 relative h-10"></div>
        </div>

        {/* these are the boxes + the x axis */}
        <div className="flex flex-col grow basis-0">
          <div className="w-full h-full relative">
            {yScale.domain().map((yCat, i) => {
              return (
                <>
                  {xScale.domain().map((xCat, j) => {
                    // get all the values that match this yCat and xCat
                    const matching = processedData.filter(
                      (d) => d.x === xCat && d.y === yCat
                    );
                    const w = xScale.bandwidth();
                    const h = yScale.bandwidth();

                    return (
                      <>
                        {matching.map((d) => {
                          const hasLabel =
                            labelRects && labelFilter(w, h, matching[0]);
                          return (
                            <div
                              key={`${i}-${j}`}
                              className="absolute flex items-center justify-center border border-transparent hover:border-gray-200 cursor-pointer"
                              style={{
                                left: `${xScale(xCat)}%`,
                                top: `${yScale(yCat)}%`,
                                width: `${w}%`,
                                height: `${h}%`,
                                backgroundColor: colorScale(d.value / colorMax),
                              }}
                            >
                              {hasLabel && (
                                <div className="text-white mix-blend-difference">
                                  {d.value}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })}
                </>
              );
            })}
          </div>
          <div className="w-full relative h-12 pt-2">
            {xScale.domain().map((d, i) => (
              <div
                className="tick absolute flex flex-col items-center justify-center"
                key={i}
                style={{
                  width: `${xScale.bandwidth()}%`,
                  left: `${xScale(d)}%`,
                }}
              >
                <div className="w-[1px] h-[5px] bg-gray-800"></div>
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
