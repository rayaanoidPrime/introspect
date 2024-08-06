import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Meta from "$components/layout/Meta";
import DbCredentialsForm from "../components/extract-metadata/DbCredentialsForm";
import MetadataTable from "../components/extract-metadata/MetadataTable";
import SetupStatus from "../components/extract-metadata/SetupStatus"; // Adjust the import path as needed
import setupBaseUrl from "$utils/setupBaseUrl";
import { Select, Row, Col, Tabs } from "antd";
import Scaffolding from "$components/layout/Scaffolding";

const { TabPane } = Tabs;
const { Option } = Select;

const ExtractMetadata = () => {
  const router = useRouter();
  const apiKeyNames = (
    process.env.NEXT_PUBLIC_API_KEY_NAMES || "REPLACE_WITH_API_KEY_NAMES"
  ).split(",");
  const [apiKeyName, setApiKeyName] = useState(apiKeyNames[0]);
  const [token, setToken] = useState("");
  const [user, setUser] = useState("");
  const [userType, setUserType] = useState("");
  const [dbData, setDbData] = useState({});
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [emptyDescriptions, setEmptyDescriptions] = useState(0);
  const [dbConnectionstatus, setDbConnectionStatus] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = localStorage.getItem("defogUser");
      const userType = localStorage.getItem("defogUserType");
      const token = localStorage.getItem("defogToken");

      setUser(user);
      setUserType(userType);
      setToken(token);

      if (user && token && userType) {
        await getTablesAndDbCreds(token, apiKeyName);
      } else {
        router.push("/log-in");
      }
    };

    

    fetchUserData();
  }, [apiKeyName]);

  const getTablesAndDbCreds = async (token, apiKeyName) => {
    setLoading(true);
    const res = await fetch(
      setupBaseUrl("http", `integration/get_tables_db_creds`),
      {
        method: "POST",
        body: JSON.stringify({
          token,
          key_name: apiKeyName,
        }),
      }
    );
    const data = await res.json();
    if (!data.error) {
      setTablesData({
        tables: data["tables"],
        indexed_tables: data["selected_tables"],
      });
      console.log("tablesData", data["tables"]);
      console.log("db_tables", data["selected_tables"]);
      setDbData({ db_type: data["db_type"], db_creds: data["db_creds"] });
      const emptyDescriptionsCount = data["tables"].reduce((count, table) => {
        // return count + table.columns.filter((col) => !col.description).length;
      }, 0);
      setEmptyDescriptions(emptyDescriptionsCount);
    }
    setLoading(false);
  };
  const validateDatabaseConnection = async (db_type, db_creds) => {
    const payload = {
      db_type,
      db_creds,
      token,
      key_name: apiKeyName,
    };
    try {
      const response = await fetch(
        setupBaseUrl("http", `integration/validate_db_connection`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      console.log("Validation response:", data);
      return data;
    } catch (error) {
      console.error("Error validating database connection:", error);
      throw new Error("Network error during database validation.");
    }
  };

  // Check if the metadata is set up
  const isTablesIndexed =
    tablesData && tablesData.indexed_tables && tablesData.indexed_tables.length > 0;

  return (
    <>
      <Meta />
      <Scaffolding id={"manage-database"} userType={"admin"}>
        <div className="w-full">
          {apiKeyNames.length > 1 ? (
            <Row type={"flex"} height={"100vh"}>
              <Col span={24} style={{ paddingBottom: "1em" }}>
                <Select
                  style={{ width: "100%" }}
                  onChange={(e) => {
                    setApiKeyName(e);
                  }}
                  options={apiKeyNames.map((item) => {
                    return { value: item, key: item, label: item };
                  })}
                  defaultValue={apiKeyName}
                />
              </Col>
            </Row>
          ) : null}

          {/* Status Indicators */}
          <SetupStatus
            loading={loading}
            isDatabaseSetupWell={dbConnectionstatus}
            isTablesIndexed={isTablesIndexed}
            emptyDescriptions={emptyDescriptions}
          />

          {/* Tabs for Database Credentials and Metadata */}
          <Tabs defaultActiveKey="1" className="w-full mt-4">
            <TabPane tab="Update Database Credentials" key="1">
              <DbCredentialsForm
                token={token}
                apiKeyName={apiKeyName}
                validateDatabaseConnection={validateDatabaseConnection}
                setDbConnectionStatus={setDbConnectionStatus}
                dbData={dbData}
                setDbData={setDbData}
              />
            </TabPane>
            <TabPane tab="Extract Metadata" key="2">
              <MetadataTable
                token={token}
                user={user}
                userType={userType}
                apiKeyName={apiKeyName}
                tablesData={tablesData}
              />
            </TabPane>
          </Tabs>
        </div>
      </Scaffolding>
    </>
  );
};
export default ExtractMetadata;
