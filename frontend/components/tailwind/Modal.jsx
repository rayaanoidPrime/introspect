import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import { XCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

// open
// onCancel
//   centered
//   footer
//   className
// title="To improve the model, could you please give more details about why this is a bad query? :)"
//           closeIcon
// onOk
// maskClosable

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
        <DialogPanel className="w-10/12 rounded-md max-h-[95%] overflow-scroll space-y-4 border bg-white px-6 py-2 pb-10 z-[2] relative">
          <div className="absolute top-2 right-2">
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
        </DialogPanel>
      </div>
    </Dialog>
  );
}
