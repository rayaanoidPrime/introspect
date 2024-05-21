import "antd/dist/reset.css";
import React, { useState } from "react";
import { Context } from "../components/common/Context";
import "../styles/base-styles.scss";
import "../styles/doc-styles.scss";
import "../styles/blocknote-styles.scss";
import "../components/defog-analysis-agent-rc/styles/agent-rc-main.scss";

export default function App({ Component, pageProps }) {
  const [context, setContext] = useState({});
  return (
    <Context.Provider value={[context, setContext]}>
      <Component {...pageProps} />
    </Context.Provider>
  );
}
