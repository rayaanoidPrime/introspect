import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";

export function Input({
  value = null,
  label = null,
  type = "text",
  status = null,
  rootClassName = "",
  placeholder = "Enter text here",
  id = "",
  name = "text-input",
  onChange = () => {},
  inputHtmlProps = {},
  inputClassName = "",
}) {
  return (
    <div className={twMerge("text-gray-600", rootClassName)}>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs mb-2 font-light text-gray-600"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <input
          type={type}
          name={name}
          id={id}
          className={twMerge(
            `block w-full focus:shadow-sm rounded-md border-0 py-1.5 pr-10 ring-1 ring-inset ring-gray-300 placeholder:text-red-300 focus:ring-1 focus:ring-inset ${status !== "error" ? "focus:ring-blue-400" : "focus:ring-rose-400"} sm:text-sm sm:leading-6`,
            inputClassName
          )}
          placeholder={placeholder}
          aria-invalid="true"
          aria-describedby="email-error"
          value={value}
          onChange={onChange}
          {...inputHtmlProps}
        />
        {status === "error" && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ExclamationCircleIcon
              className="h-5 w-5 stroke-rose-400 text-transparent"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}
