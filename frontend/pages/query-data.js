import React, { useState, useEffect, useContext } from "react";
import Meta from "../components/common/Meta";
import Scaffolding from "../components/common/Scaffolding";
import dynamic from "next/dynamic";
import { Switch } from "antd/lib";
import { DocContext } from "../components/docs/DocContext";
import setupBaseUrl from "../utils/setupBaseUrl";
import { setupWebsocketManager } from "../utils/websocket-manager";

const AskDefogChat = dynamic(
  () => import("defog-components").then((module) => module.AskDefogChat),
  {
    ssr: false,
  }
);

const AnalysisAgent = dynamic(
  () =>
    import(
      "../components/defog-components/components/agent/AnalysisAgent"
    ).then((module) => module.AnalysisAgent),
  {
    ssr: false,
  }
);

const QueryDatabase = () => {
  const [selectedTables, setSelectedTables] = useState([]);
  const [token, setToken] = useState();
  const [user, setUser] = useState();
  const [userType, setUserType] = useState();
  const [devMode, setDevMode] = useState(false);
  const [ignoreCache, setIgnoreCache] = useState(false);
  const [allowCaching, setAllowCaching] = useState("YES");
  const [docContext, setDocContext] = useState(useContext(DocContext));

  useEffect(() => {
    // check if exists
    setAllowCaching(
      process.env.NEXT_PUBLIC_ALLOW_CACHING || "REPLACE_WITH_ALLOW_CACHING"
    );

    async function setupConnections() {
      const urlToConnect = setupBaseUrl("ws", "ws");
      const mgr = await setupWebsocketManager(urlToConnect);

      const rerunMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/step_rerun")
      );

      const toolSocketManager = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/edit_tool_run"),
        (d) => console.log(d)
      );

      setDocContext({
        ...docContext,
        socketManagers: {
          mainManager: mgr,
          reRunManager: rerunMgr,
          toolSocketManager: toolSocketManager,
        },
      });
    }

    setupConnections();

    const token = localStorage.getItem("defogToken");
    const userType = localStorage.getItem("defogUserType");
    const user = localStorage.getItem("defogUser");
    setUser(user);
    setUserType(userType);
    setToken(token);
    const res = fetch(setupBaseUrl("http", "integration/get_tables_db_creds"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.selected_tables) {
          setSelectedTables(data.selected_tables);
        }
      });
  }, []);

  useEffect(() => {
    if (allowCaching !== "YES") {
      setIgnoreCache(true);
    }
  }, [allowCaching]);

  return (
    <>
      <Meta />
      <Scaffolding id={"query-data"} userType={userType}>
        <h1>Query your database</h1>
        <p>
          Ask Defog questions about your data. You have selected the following
          tables: <code>{selectedTables.join(", ")}</code>
        </p>
        {userType === "admin" ? (
          <Switch
            checkedChildren="Production"
            unCheckedChildren="Development"
            checked={!devMode}
            onChange={(e) => {
              console.log(e);
              setDevMode(!e);
            }}
          />
        ) : null}
        {userType === "admin" && allowCaching === "YES" ? (
          <Switch
            checkedChildren="Use Cache"
            unCheckedChildren="Ignore Cache"
            checked={!ignoreCache}
            onChange={(e) => {
              console.log(e);
              setIgnoreCache(!e);
            }}
          />
        ) : null}
        {token ? (
          <AskDefogChat
            maxWidth={"100%"}
            height={"80vh"}
            apiEndpoint={setupBaseUrl("http", "query")}
            apiKey={
              process.env.NEXT_PUBLIC_DEFOG_API_KEY ||
              "REPLACE_WITH_DEFOG_API_KEY"
            }
            buttonText={
              process.env.NEXT_PUBLIC_BUTTON_TEXT || "REPLACE_WITH_BUTTON_TEXT"
            }
            placeholderText={"Ask your data questions here"}
            darkMode={false}
            debugMode={userType === "admin" ? true : false}
            additionalParams={{
              token: token,
              dev: devMode,
              ignore_cache: ignoreCache,
            }}
            clearOnAnswer={true}
            guidedTeaching={userType === "admin" ? true : false}
            dev={devMode}
            chartTypeEndpoint="/get_chart_types"
          />
        ) : null}

        <DocContext.Provider value={{ val: docContext, update: setDocContext }}>
          <AnalysisAgent
            analysisId={"temporary"}
            username={user}
            apiToken={
              process.env.NEXT_PUBLIC_DEFOG_API_KEY ||
              "REPLACE_WITH_DEFOG_API_KEY"
            }
          />
        </DocContext.Provider>
      </Scaffolding>
    </>
  );
};

export default QueryDatabase;
