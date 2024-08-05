import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Meta from "$components/layout/Meta";
import DbCredentialsForm from "../components/extract-metadata/DbCredentialsForm";
import MetadataTable from "../components/extract-metadata/MetadataTable";
import SetupStatus from "../components/extract-metadata/SetupStatus"; // Adjust the import path as needed
import setupBaseUrl from "$utils/setupBaseUrl";
import { Input, Select, Form, Button, Row, Col, message, Tabs } from "antd";
import Scaffolding from "$components/layout/Scaffolding";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

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
        db_tables: data["selected_tables"],
      });
      setDbData({ dbType: data["db_type"], ...data["db_creds"] });
      const emptyDescriptionsCount = data["tables"].reduce((count, table) => {
        // return count + table.columns.filter((col) => !col.description).length;
      }, 0);
      setEmptyDescriptions(emptyDescriptionsCount);
    }
    setLoading(false);
  };

  // Check if the database is set up well
  const isDatabaseSetupWell =
    dbData && dbData.dbType && Object.keys(dbData).length > 1;

  // Check if the metadata is set up
  const isMetadataSetup =
    tablesData && tablesData.tables && tablesData.tables.length > 0;

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
            isDatabaseSetupWell={isDatabaseSetupWell}
            isMetadataSetup={isMetadataSetup}
            emptyDescriptions={emptyDescriptions}
          />

          {/* Tabs for Database Credentials and Metadata */}
          <Tabs defaultActiveKey="1" className="w-full mt-4">
            <TabPane tab="Update Database Credentials" key="1">
              <DbCredentialsForm
                token={token}
                apiKeyName={apiKeyName}
                dbData={dbData}
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
