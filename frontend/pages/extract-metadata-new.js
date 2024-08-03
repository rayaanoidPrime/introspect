import { useState, useEffect } from "react";
import Meta from "$components/layout/Meta";
import DbCredentialsForm from "../components/extract-metadata/DbCredentialsForm";
import MetadataTable from "../components/extract-metadata/MetadataTable";
import setupBaseUrl from "$utils/setupBaseUrl";
import {
  Input,
  Select,
  Form,
  Button,
  Row,
  Col,
  Switch,
  message,
} from "antd/lib";
import { FloatButton, Tabs } from "antd";
import Scaffolding from "$components/layout/Scaffolding";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

const { Option } = Select;

const ExtractMetadata = () => {
  const apiKeyNames = (
    process.env.NEXT_PUBLIC_API_KEY_NAMES || "REPLACE_WITH_API_KEY_NAMES"
  ).split(",");
  const [apiKeyName, setApiKeyName] = useState(apiKeyNames[0]);
  const [token, setToken] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("defogUser");
    const token = localStorage.getItem("defogToken");
    setToken(token);
  }, []);

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

          <div className="w-full">
            <div
              onClick={() => setShowForm(!showForm)}
              className="cursor-pointer bg-gray-200 text-gray-700 py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out hover:bg-gray-300 mb-4 text-center flex items-center justify-between"
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
                setupBaseUrl={setupBaseUrl}
              />
            </div>
          </div>
        </div>
      </Scaffolding>
    </>
  );
};
export default ExtractMetadata;
