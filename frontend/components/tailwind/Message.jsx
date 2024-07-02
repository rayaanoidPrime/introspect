import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { twMerge } from "tailwind-merge";
import { v4 } from "uuid";

export function MessageManager() {
  let list = [];
  let listeners = [];

  const deleteAfter = 3000;

  const deleteMessage = (id) => {
    list = list.filter((m) => m.id !== id);
    emitChange();
  };

  function addMessage(type, message) {
    const time = new Date().getTime();
    const id = v4();

    list = [
      ...list,
      {
        type: type,
        id,
        message: typeof message === "string" ? message : message.message,
        time,
        deleteInterval: setTimeout(() => {
          deleteMessage(id);
        }, deleteAfter),
      },
    ];
  }

  function success(message) {
    addMessage("success", message);
    emitChange();
  }

  function error(message) {
    addMessage("error", message);
    emitChange();
  }

  function warning(message) {
    addMessage("warning", message);

    emitChange();
  }

  function clear() {
    list = [];
  }

  function subscribe(listener) {
    listeners = [...listeners, listener];

    return function unsubscribe() {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function emitChange() {
    listeners.forEach((l) => l());
  }

  function getList() {
    return list;
  }

  return {
    success,
    error,
    warning,
    subscribe,
    getList,
    clear,
    // for ssr purposes
    getServerSnapshot: function () {
      return list;
    },
    get gg() {
      return {
        list: list.slice(),
        listeners: listeners.slice(),
      };
    },
  };
}

export const MessageManagerContext = createContext(null);

const icons = {
  success: <CheckCircleIcon className="text-lime-500 w-4 h-4" />,
  warning: <ExclamationCircleIcon className="text-yellow-400 w-4 h-4" />,
  error: <XCircleIcon className="text-rose-500 w-4 h-4" />,
};

export function MessageMonitor() {
  const messageManager = useContext(MessageManagerContext);

  const messages = useSyncExternalStore(
    messageManager.subscribe,
    messageManager.getList,
    messageManager.getServerSnapshot
  );

  return (
    <div className="fixed flex flex-col items-center w-full top-0 justify-center pt-4 z-[2000] *:transition-all pointer-events-none">
      {messages.map((message, i) => (
        <div
          key={message.time}
          className={twMerge(
            `my-2 flex flex-row gap-2 items-center max-w-[80%] p-2 shadow-md bg-white text-gray-800 mx-auto rounded-lg max-w-10/12 border animate-fade-in-down`,
            message.type === "success" && "border-lime-500",
            message.type === "warning" && "border-yellow-400",
            message.type === "error" && "border-rose-500"
          )}
        >
          <span>{icons[message.type]}</span>
          <span className="grow">{message.message}</span>
        </div>
      ))}
    </div>
  );
}
