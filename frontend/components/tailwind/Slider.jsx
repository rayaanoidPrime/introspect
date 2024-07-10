// controllable slider component

import React, { useState } from "react";
import { twMerge } from "tailwind-merge";

export function Slider({
  min = 0,
  max = 10,
  step = 1,
  defaultValue = undefined,
  value = undefined,
  onChange = (...args) => {},
  rootClassNames = "",
  ...sliderHtmlProps
}) {
  const [v, setV] = useState(value);

  return (
    <input
      // white slider with indigo thumb
      className={twMerge(
        "w-ful bg-white border  appearance-none rounded-2xl",
        rootClassNames
      )}
      type="range"
      min={min}
      max={max}
      onChange={(e) => {
        setV(e.target.value);
        onChange(e.target.value);
      }}
      {...sliderHtmlProps}
      {...{ defaultValue, value }}
    />
  );
}
