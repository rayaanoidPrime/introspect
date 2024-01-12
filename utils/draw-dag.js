import * as d3 from "d3";
import * as d3dag from "d3-dag";

export function createDag(data, nodeRadius = 5) {
  // ----- //
  // Setup //
  // ----- //

  /**
   * get transform for arrow rendering
   *
   * This transform takes anything with points (a graph link) and returns a
   * transform that puts an arrow on the last point, aligned based off of the
   * second to last.
   */
  function arrowTransform({ points }) {
    const [[x1, y1], [x2, y2]] = points.slice(-2);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90;
    return `translate(${x2}, ${y2}) rotate(${angle})`;
  }

  // create our builder and turn the raw data into a graph
  const builder = d3dag.graphStratify();
  const graph = builder(data);

  // -------------- //
  // Compute Layout //
  // -------------- //

  // set the layout functions
  // [y size, x size]
  const nodeSize = [nodeRadius, nodeRadius];
  // this truncates the edges so we can render arrows nicely
  // const shape = d3dag.tweakShape(nodeSize, d3dag.shapeEllipse);
  // use this to render our edges
  const line = d3
    .line()
    .curve(d3.curveMonotoneY)
    .x((d) => d[1])
    .y((d) => d[0]);

  // here's the layout operator, uncomment some of the settings
  const layout = d3dag
    .sugiyama()
    // .layering(d3dag.layeringLongestPath())
    // .decross(d3dag.decrossOpt())
    // this centers the nodes
    .coord(d3dag.coordGreedy())
    .nodeSize(nodeSize)
    // [y gap, x gap]
    .gap([nodeRadius * 4, nodeRadius * 10]);
  // .tweaks([shape]);

  // actually perform the layout and get the final size
  const { width, height } = layout(graph);

  return { dag: graph, width, height };

  // --------- //
  // Rendering //
  // --------- //

  // colors
  //   const steps = graph.nnodes() - 1;
  //   const interp = d3.interpolateRainbow;
  //   const colorMap = new Map(
  //     [...graph.nodes()]
  //       .sort((a, b) => a.y - b.y)
  //       .map((node, i) => [node.data.id, interp(i / steps)])
  //   );

  //   // global
  //   const svg = ctr
  //     .select("svg")
  //     // pad a little for link thickness
  //     .style("width", height + 100)
  //     .style("height", width + 100);

  //   const trans = svg.transition().duration(750);
  //   console.log(Array.from(graph.nodes()));
  //   // nodes
  //   svg
  //     .select(".nodes")
  //     .selectAll("g")
  //     .data(graph.nodes(), (d) => d.id)
  //     .join((enter) =>
  //       enter
  //         .append("g")
  //         .attr("transform", ({ x, y }) => `translate(${y}, ${x})`)
  //         // .attr("opacity", 0)
  //         .call((enter) => {
  //           enter
  //             .append("circle")
  //             .attr("r", nodeRadius)
  //             .attr("fill", "lightgray");
  //           enter
  //             .append("text")
  //             .text((d) => d.data.title)
  //             .attr("font-weight", "bold")
  //             .attr("font-family", "sans-serif")
  //             .attr("text-anchor", "middle")
  //             .attr("alignment-baseline", "middle")
  //             .attr("fill", "black");
  //           enter.transition(trans).attr("opacity", 1);
  //         })
  //     );

  //   // link paths
  //   svg
  //     .select(".links")
  //     .selectAll("path")
  //     .data(graph.links())
  //     .join(
  //       (enter) =>
  //         enter
  //           .append("path")
  //           .attr("d", ({ points }) => line(points))
  //           .attr("fill", "none")
  //           .attr("stroke-width", 1)
  //           .attr(
  //             "stroke",
  //             //   ({ source, target }) => `url(#${source.data.id}--${target.data.id})`
  //             "black"
  //           )
  //           .attr("opacity", 0)
  //           .call((enter) => enter.transition(trans).attr("opacity", 1)),
  //       (update) => update.attr("d", ({ points }) => line(points))
  //     );

  //   // Arrows
  //   const arrowSize = 80;
  //   const arrowLen = Math.sqrt((4 * arrowSize) / Math.sqrt(3));
  //   const arrow = d3.symbol().type(d3.symbolTriangle).size(arrowSize);
  //   svg
  //     .select(".arrows")
  //     .selectAll("path")
  //     .data(graph.links())
  //     .join((enter) =>
  //       enter
  //         .append("path")
  //         .attr("d", arrow)
  //         .attr("fill", ({ target }) => colorMap.get(target.data.id))
  //         .attr("transform", arrowTransform)
  //         .attr("opacity", 0)
  //         .attr("stroke", "black")
  //         .attr("stroke-width", 2)
  //         // use this to put a black boundary on the tip of the arrow
  //         .attr("stroke-dasharray", `${arrowLen},${arrowLen}`)
  //         .call((enter) => enter.transition(trans).attr("opacity", 1))
  //     );
}
