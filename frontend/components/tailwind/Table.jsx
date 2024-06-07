import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import SingleSelect from "./SingleSelect";
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";

const people = [
  {
    name: "Lindsay Walton",
    title: "Front-end Developer",
    email: "lindsay.walton@example.com",
    role: "Member",
  },
  // More people...
];

const allowedPageSizes = [10, 20, 50, 100];

export default function Table({
  columns,
  rows,
  rootClassName = "",
  pagination = { defaultPageSize: 10, showSizeChanger: true },
  skipColumns = [],
}) {
  // name of the property in the rows objects where each column's data is stored
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.defaultPageSize);
  const columnsToDisplay = useMemo(
    () => columns.filter((column) => !skipColumns.includes(column.dataIndex)),
    [columns, skipColumns]
  );

  const dataIndexes = columnsToDisplay.map((d) => d.dataIndex);
  const maxPage = Math.ceil(rows.length / pageSize);

  return (
    <div className={twMerge("overflow-auto", rootClassName)}>
      <div className="overflow-auto">
        <div className="py-2">
          <table className="divide-y w-full divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {columnsToDisplay.map((column, i) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={twMerge(
                      i === 0 ? "pl-4" : "px-3",
                      "py-3.5 text-left text-sm font-semibold text-gray-900",
                      i === columnsToDisplay.length - 1
                        ? "pr-4 sm:pr-6 lg:pr-8"
                        : ""
                    )}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((row) => (
                  <tr key={row.key}>
                    {dataIndexes.map((dataIndex, i) => (
                      <td
                        key={row.key + "-" + dataIndex}
                        className={twMerge(
                          i === 0 ? "pl-4" : "px-3",
                          "py-4 text-sm text-gray-500",
                          i === dataIndexes.length - 1
                            ? "pr-4 sm:pr-6 lg:pr-8"
                            : ""
                        )}
                      >
                        {row[dataIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pl-4 pager mt-3 text-center bg-white">
        <div className="w-full flex flex-row justify-end items-center">
          <div className="flex flex-row w-50 items-center">
            <div className="text-gray-600">
              Page
              <span className="mx-1 font-semibold">{currentPage}</span>/
              <span className="mx-1 font-semibold">{maxPage}</span>
            </div>
            <ChevronLeftIcon
              className={twMerge(
                "w-5 cursor-not-allowed",
                currentPage === 1
                  ? "text-gray-300"
                  : "hover:text-blue-500 cursor-pointer"
              )}
              onClick={() => {
                setCurrentPage(currentPage - 1 < 1 ? 1 : currentPage - 1);
              }}
            />
            <ChevronRightIcon
              className={twMerge(
                "w-5 cursor-pointer",
                currentPage === maxPage
                  ? "text-gray-300 cursor-not-allowed"
                  : "hover:text-blue-500 cursor-pointer"
              )}
              onClick={() => {
                setCurrentPage(
                  currentPage + 1 > maxPage ? maxPage : currentPage + 1
                );
              }}
            />
          </div>
          <div className="w-full flex">
            <SingleSelect
              rootClassName="w-24"
              options={allowedPageSizes.map((d) => ({ value: d, label: d }))}
              defaultValue={pageSize}
              onChange={(opt) => setPageSize(opt.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
