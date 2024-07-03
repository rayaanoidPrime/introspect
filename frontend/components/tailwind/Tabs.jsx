import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function Tabs({
  tabs = [],
  defaultSelected = null,
  selected = null,
}) {
  const [selectedTab, setSelectedTab] = useState(
    (defaultSelected && tabs.find((tab) => tab.name === defaultSelected)) ||
      selected ||
      tabs[0]
  );

  useEffect(() => {
    if (selected !== selectedTab.name) {
      setSelectedTab(tabs.find((tab) => tab.name === selected) || tabs[0]);
    }
  }, [selected]);

  return (
    <>
      <div className="tab-group mb-5">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            Select a tab
          </label>
          {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            defaultValue={defaultSelected}
          >
            {tabs.map((tab) => (
              <option
                key={tab.name}
                onClick={() => {
                  setSelectedTab(tab);
                }}
              >
                {tab.name}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <nav
            className="isolate flex divide-x divide-gray-200 rounded-lg shadow"
            aria-label="Tabs"
          >
            {tabs.map((tab, tabIdx) => (
              <div
                key={tab.name}
                className={twMerge(
                  selectedTab.name === tab.name
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700",
                  tabIdx === 0 ? "rounded-l-lg" : "",
                  tabIdx === tabs.length - 1 ? "rounded-r-lg" : "",
                  "group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10"
                )}
                onClick={() => {
                  setSelectedTab(tab);
                }}
                aria-current={
                  selectedTab.name === tab.name ? "page" : undefined
                }
              >
                <span>{tab.name}</span>
                <span
                  aria-hidden="true"
                  className={twMerge(
                    selectedTab.name === tab.name
                      ? "bg-indigo-500"
                      : "bg-transparent",
                    "absolute inset-x-0 bottom-0 h-0.5"
                  )}
                />
              </div>
            ))}
          </nav>
        </div>
      </div>
      <div className="tab-content">{selectedTab?.content || <></>}</div>
    </>
  );
}
