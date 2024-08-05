
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Meta from "$components/layout/Meta";
import DbCredentialsForm from "../components/extract-metadata/DbCredentialsForm";
import MetadataTable from "../components/extract-metadata/MetadataTable";
import SetupStatus from "../components/extract-metadata/SetupStatus"; // Adjust the import path as needed
import setupBaseUrl from "$utils/setupBaseUrl";
import { Input, Select, Form, Button, Row, Col, message } from "antd";
import { FloatButton, Tabs } from "antd";
import Scaffolding from "$components/layout/Scaffolding";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

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
  const [showForm, setShowForm] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [dbData, setDbData] = useState({});
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);

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
      if (!(data["db_type"] && Object.keys(data["db_creds"]).length > 1)) {
        setShowForm(true);
      }
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
          />

          {/* Updating Database Credentials Form */}
          <div className="w-full">
            <div
              onClick={() => setShowForm(!showForm)}
              className="cursor-pointer bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out hover:bg-gray-300text-center flex items-center justify-between"
            >
              <span className="flex-1 text-center">
                {showForm
                  ? "Update Database Credentials"
                  : "Show Database Credentials"}
              </span>
              {showForm ? (
                <UpOutlined className="ml-2" />
              ) : (
                <DownOutlined className="ml-2" />
              )}
            </div>
            <div
              className={`w-full bg-gray-100 p-3 rounded-lg shadow-md transition-all duration-500 ease-in-out ${showForm ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
            >
              <DbCredentialsForm
                token={token}
                apiKeyName={apiKeyName}
                dbData={dbData}
              />
            </div>
          </div>

          {/* Extracting/Updating Metadata for the associated api key */}
          <div className="w-full">
            <div
              onClick={() => setShowMetadata(!showMetadata)}
              className="cursor-pointer bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out hover:bg-gray-300 mb-4 text-center flex items-center justify-between"
            >
              <span className="flex-1 text-center">
                {showMetadata
                  ? "View and Update Metadata"
                  : "View and Update Metadata"}
              </span>
              {showMetadata ? (
                <UpOutlined className="ml-2" />
              ) : (
                <DownOutlined className="ml-2" />
              )}
            </div>
            <div
              className={`w-full bg-gray-50 p-3 rounded-lg shadow-md transition-all duration-500 ease-in-out ${showMetadata ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
            >
              <MetadataTable
                token={token}
                user={user}
                userType={userType}
                apiKeyName={apiKeyName}
                tablesData={tablesData}
              />
            </div>
          </div>
        </div>
      </Scaffolding>
    </>
  );
};
export default ExtractMetadata;
