import "antd/dist/reset.css";
import React, { useState } from "react";
import { Context } from "$components/common/Context";
import "../styles/base-styles.scss";
import "../styles/agent-loader.scss";
import "../styles/clarify.scss";
import "../styles/writer.scss";
import "../styles/doc-icon.scss";
import "../styles/view-notebooks.scss";
import "../styles/doc-styles.scss";
import "../styles/blocknote-styles.scss";
import "../styles/query-data.scss";
import {
  MessageMonitor,
  MessageManagerContext,
  MessageManager,
} from "$components/tailwind/Message";

export default function App({ Component, pageProps }) {
  const [context, setContext] = useState({});

  return (
    <Context.Provider value={[context, setContext]}>
      <MessageManagerContext.Provider value={MessageManager()}>
        <MessageMonitor />
        <Component {...pageProps} />
      </MessageManagerContext.Provider>
    </Context.Provider>
  );
}
