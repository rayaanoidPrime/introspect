import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import { XCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function Modal({
  children = null,
  open = false,
  onCancel = () => {},
  footer = null,
  title = null,
  closeIcon = (
    <XCircleIcon className="w-6 h-6 text-gray-300 hover:text-gray-600" />
  ),
  onOk = () => {},
  maskClosable = true,
  rootClassNames = "",
  className = "",
  contentClassNames = "",
}) {
  let [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        onCancel();
      }}
      className={twMerge("relative z-50", rootClassNames, className)}
    >
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 animate-fade-in transition duration-300 ease-out data-[closed]:opacity-0">
        <div className="absolute w-full h-full bg-gray-800 opacity-50 left-0 top-0 z-[1]"></div>
        <DialogPanel className="h-[95%] overflow-scroll w-10/12 space-y-4 z-[2] relative flex flex-row items-center pointer-events-none">
          <div
            className={twMerge(
              "relative max-h-full overflow-scroll p-4 bg-white rounded-md grow pointer-events-auto ",
              contentClassNames
            )}
          >
            <div className="absolute top-2 right-2 z-[3]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCancel();
                }}
                className="p-1"
              >
                {closeIcon}
              </button>
            </div>
            {title && <DialogTitle>{title}</DialogTitle>}
            {children}
            {footer}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
