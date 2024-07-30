"use-client";
import React, { useState } from "react";
import "../styles/globals.css";
import "@defogdotai/agents-ui-components/css";
import {
  MessageMonitor,
  MessageManagerContext,
  MessageManager,
} from "@defogdotai/agents-ui-components/core-ui";
import { UserContext } from "$components/context/UserContext";

export default function App({ Component, pageProps }) {
  const [context, setContext] = useState({});

  return (
    <UserContext.Provider value={[context, setContext]}>
      <MessageManagerContext.Provider value={MessageManager()}>
        <MessageMonitor />
        <Component {...pageProps} />
      </MessageManagerContext.Provider>
    </UserContext.Provider>
  );
}
