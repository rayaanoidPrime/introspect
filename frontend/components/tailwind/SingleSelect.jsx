import { isNumber } from "$utils/utils";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

const inputSizeClasses = {
  default: "py-1.5 pl-3",
  small: "py-0 pl-3",
};

const popupSizeClasses = {
  default: "",
  small: "",
};

const popupOptionSizeClasses = {
  default: "py-2 pl-3 pr-9",
  small: "py-1 pl-3 pr-9",
};

const createNewOption = (val) => {
  return {
    label: val,
    value: isNumber(val) ? +val : val,
  };
};

export default function SingleSelect({
  rootClassNames = "",
  popupClassName = "",
  onChange = null,
  defaultValue = undefined,
  value = undefined,
  disabled = false,
  options = [],
  label = null,
  optionRenderer = null,
  placeholder = "Select an option",
  size = "default",
  allowClear = true,
  allowCreateNewOption = true,
}) {
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const [internalOptions, setInternalOptions] = useState(options);

  const filteredOptions =
    query === ""
      ? internalOptions
      : internalOptions.filter((option) => {
          return (option.label + "")
            .toLowerCase()
            .includes(query.toLowerCase());
        });

  // if there's no matching option
  // or if there's no exact match
  // create a new option
  if (
    allowCreateNewOption &&
    query !== "" &&
    (filteredOptions.length === 0 ||
      !filteredOptions.find(
        (option) => option.label === (isNumber(query) ? +query : query)
      ))
  ) {
    filteredOptions.push({
      label: query,
      value: isNumber(query) ? +query : query,
    });
  }

  // find the option matching the default value
  const [selectedOption, setSelectedOption] = useState(
    internalOptions.find((option) => option.value === defaultValue) || null
  );

  useEffect(() => {
    const opt =
      internalOptions.find((option) => option.value === value) || null;

    // if option doesn't exist, create a new one
    if (!opt && allowCreateNewOption && value !== null) {
      setInternalOptions([...internalOptions, createNewOption(value)]);
    }

    setSelectedOption(opt);
  }, [value, allowCreateNewOption, internalOptions]);

  useEffect(() => {
    ref?.current?.blur?.();
  }, [selectedOption]);

  return (
    <Combobox
      as="div"
      by="value"
      className={rootClassNames}
      value={selectedOption}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(option) => {
        if (!option) return;
        setSelectedOption(option);

        if (option && onChange && typeof onChange === "function") {
          onChange(option.value, option);
        }
      }}
    >
      {label && (
        <label className="block text-xs mb-2 font-light text-gray-600">
          {label}
        </label>
      )}
      <div className="relative">
        <ComboboxInput
          ref={ref}
          placeholder={placeholder}
          className={twMerge(
            "w-full rounded-md border-0 pr-12 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-400 sm:text-sm sm:leading-6",
            inputSizeClasses[size] || inputSizeClasses["default"],
            disabled ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"
          )}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onBlur={() => {
            setQuery("");
          }}
          displayValue={(option) => option && option?.label}
        />

        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          {allowClear && (
            <XCircleIcon
              className="w-4 fill-gray-200 hover:fill-gray-500"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                setSelectedOption(null);
                setQuery("");
                if (onChange && typeof onChange === "function") {
                  onChange(null, null);
                }
              }}
            />
          )}
          <ChevronUpDownIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </ComboboxButton>

        {filteredOptions.length > 0 && (
          <ComboboxOptions
            anchor="bottom"
            className={twMerge(
              "w-[var(--input-width)] z-10 mt-1 max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm absolute",
              popupSizeClasses[size] || popupSizeClasses["default"],
              popupClassName
            )}
          >
            {filteredOptions.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className={({ focus }) =>
                  twMerge(
                    "relative cursor-default select-none",
                    popupOptionSizeClasses[size] ||
                      popupOptionSizeClasses["default"],
                    focus ? "bg-blue-400 text-white" : "text-gray-900"
                  )
                }
              >
                {({ focus, selected }) => {
                  return (
                    <>
                      {optionRenderer ? (
                        optionRenderer(option, focus, selected)
                      ) : (
                        <>
                          <span
                            className={twMerge(
                              "block truncate",
                              selected && "font-semibold"
                            )}
                          >
                            {option.label}
                          </span>
                        </>
                      )}
                      {selected && (
                        <span
                          className={twMerge(
                            "absolute inset-y-0 right-0 flex items-center pr-4",
                            focus ? "text-white" : "text-blue-400"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  );
                }}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </div>
    </Combobox>
  );
}
