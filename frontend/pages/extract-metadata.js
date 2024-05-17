import React, { useState, useEffect } from "react";
import Meta from "../components/common/Meta";
import Scaffolding from "../components/common/Scaffolding";
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
import setupBaseUrl from "../utils/setupBaseUrl";

const ExtractMetadata = () => {
  const { Option } = Select;
  // const [apiKey, setApiKey] = useState("");
  // const [inference, setInference] = useState("api"); // either api or self-hosted
  const [dbType, setDbType] = useState("postgres");
  const [dbCreds, setDbCreds] = useState({});
  const [devMode, setDevMode] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [token, setToken] = useState("");
  const [form] = Form.useForm();
  const [allowUpdates, setAllowUpdates] = useState("NO");

  const getTables = async () => {
    // load from local storage and
    const user = localStorage.getItem("defogUser");
    const token = localStorage.getItem("defogToken");
    setToken(token);
    const userType = localStorage.getItem("defogUserType");

    if (!user || !token || !userType) {
      // redirect to login page
      router.push("/log-in");
      return;
    }
    const res = await fetch(
      setupBaseUrl("http", `integration/get_tables_db_creds`),
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );
    const data = await res.json();
    if (!data.error) {
      // reset the current values in the db_creds form
      setDbType(data["db_type"]);
      setDbCreds(data["db_creds"]);
      setTables(data["tables"]);
      setSelectedTables(data["selected_tables"]);
      form.setFieldsValue({
        db_type: data["db_type"],
        ...data["db_creds"],
        db_tables: data["selected_tables"],
      });
    }
  };

  const getMetadata = async () => {
    const token = localStorage.getItem("defogToken");
    setToken(token);
    const res = await fetch(setupBaseUrl("http", `integration/get_metadata`), {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!data.error) {
      setMetadata(data?.metadata || []);
    }
  };

  useEffect(() => {
    setLoading(true);
    setAllowUpdates(
      process.env.NEXT_PUBLIC_ALLOW_UPDATES || "REPLACE_WITH_ALLOW_UPDATES"
    );
    // get the db creds and preloaded tables
    getTables().then(() => {
      getMetadata().then(() => {
        setLoading(false);
      });
    });

    // get the current status
  }, []);

  const dbCredOptions = {
    postgres: ["host", "port", "user", "password", "database"],
    redshift: ["host", "port", "user", "password", "database", "schema"],
    snowflake: ["account", "warehouse", "user", "password"],
    databricks: ["server_hostname", "access_token", "http_path", "schema"],
    bigquery: [],
  };

  return (
    <>
      <Meta />
      <Scaffolding id={"manage-database"} userType={"admin"}>
        <h1 style={{ paddingBottom: "1em" }}>Extract Metadata</h1>

        {/* select database type and enter API key */}
        <Row type={"flex"} height={"100vh"}>
          <Col span={24} style={{ paddingBottom: "1em" }}>
            <Switch
              checkedChildren="Production"
              unCheckedChildren="Development"
              checked={!devMode}
              onChange={(e) => {
                console.log(e);
                setDevMode(!e);
                setMetadata([]);
              }}
            />
          </Col>
          <Col md={{ span: 8 }} xs={{ span: 24 }}>
            <div>
              <Form
                name="db_creds"
                form={form}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                style={{ maxWidth: 400 }}
                disabled={loading}
                onFinish={async (values) => {
                  setLoading(true);
                  values = {
                    db_creds: values,
                    db_type: values["db_type"] || dbType,
                    token: token,
                  };
                  try {
                    const res = await fetch(
                      setupBaseUrl("http", `integration/update_db_creds`),
                      {
                        method: "POST",
                        body: JSON.stringify(values),
                      }
                    );
                    const data = await res.json();
                    setLoading(false);
                    message.success(
                      "Database Credentials updated successfully!"
                    );

                    // also get the new list of tables
                    await getTables();
                  } catch (e) {
                    console.log(e);
                    setLoading(false);
                    message.error(
                      "Error fetching tables. Please check your docker logs for more informati)on."
                    );
                  }
                }}
              >
                <Form.Item name="db_type" label="DB Type">
                  <Select
                    style={{ width: "100%" }}
                    onChange={(e) => {
                      setDbType(e);
                      if (e === "bigquery") {
                        // click the submit button
                        document.getElementById("update-db-creds-btn").click();
                      }
                    }}
                    options={[
                      "databricks",
                      // "mysql",
                      "postgres",
                      "redshift",
                      "snowflake",
                      "bigquery",
                    ].map((item) => {
                      return { value: item, key: item, label: item };
                    })}
                  />
                </Form.Item>
                {/* create form inputs based on the value selected above */}
                {dbCredOptions[dbType] !== undefined &&
                  dbCredOptions[dbType].map((item) => {
                    let toReturn;
                    if (item !== "password") {
                      toReturn = (
                        <Form.Item
                          label={item}
                          name={item}
                          key={dbType + "_" + item}
                        >
                          <Input style={{ width: "100%" }} />
                        </Form.Item>
                      );
                    } else {
                      toReturn = (
                        <Form.Item
                          label={item}
                          name={item}
                          key={dbType + "_" + item}
                        >
                          <Input.Password style={{ width: "100%" }} />
                        </Form.Item>
                      );
                    }
                    return toReturn;
                  })}
                <Form.Item wrapperCol={{ span: 24 }}>
                  <Button
                    type={"primary"}
                    style={{ width: "100%" }}
                    htmlType="submit"
                    id="update-db-creds-btn"
                  >
                    Update DB Credentials
                  </Button>
                </Form.Item>
              </Form>

              <Form
                name="db_tables"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{
                  maxWidth: 400,
                  visibility: allowUpdates === "YES" ? "visible" : "hidden",
                }}
                disabled={loading}
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    message.info(
                      "Extracting metadata from selected tables. This can take up to 5 minutes. Please be patient."
                    );
                    const res = await fetch(
                      setupBaseUrl("http", `integration/generate_metadata`),
                      {
                        method: "POST",
                        body: JSON.stringify({
                          tables: values["tables"],
                          token: token,
                          dev: devMode,
                        }),
                      }
                    );
                    const data = await res.json();
                    setLoading(false);
                    setMetadata(data?.metadata || []);
                  } catch (e) {
                    console.log(e);
                    setLoading(false);
                    message.error(
                      "Error fetching metadata - please look at your docker logs fo)r more information."
                    );
                  }
                }}
              >
                <Form.Item
                  name="tables"
                  label="Tables to index"
                  value={selectedTables}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%", maxWidth: 400 }}
                    placeholder="Add tables to index"
                    onChange={(e) => {
                      console.log(e);
                      setSelectedTables(e);
                    }}
                  >
                    {tables.map((table) => (
                      <Option value={table} key={table}>
                        {table}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item wrapperCol={{ span: 24 }}>
                  <Button
                    type="primary"
                    style={{ width: "100%", maxWidth: 535 }}
                    htmlType="submit"
                  >
                    Extract Metadata
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Col>

          <Col
            md={{ span: 16 }}
            xs={{ span: 24 }}
            style={{ paddingRight: "2em", height: 600, overflowY: "scroll" }}
          >
            {metadata.length > 0 && (
              <Button
                type="primary"
                style={{ width: "100%", maxWidth: 535 }}
                disabled={loading}
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  const res = await fetch(
                    setupBaseUrl("http", `integration/update_metadata`),
                    {
                      method: "POST",
                      body: JSON.stringify({
                        metadata: metadata,
                        token: token,
                        dev: devMode,
                      }),
                    }
                  );
                  const data = await res.json();
                  setLoading(false);
                  if (
                    data["suggested_joins"] !== undefined &&
                    data["suggested_joins"] !== null &&
                    data["suggested_joins"] !== ""
                  ) {
                    // also update the value of the text area
                    document.getElementById("allowed-joins").value =
                      data["suggested_joins"];
                  }

                  message.success("Metadata updated successfully!");
                }}
              >
                Update metadata on server
              </Button>
            )}
            {metadata.length > 0 ? (
              <Row
                style={{
                  marginTop: "1em",
                  position: "sticky",
                  top: 0,
                  paddingBottom: "1em",
                  paddingTop: "1em",
                  backgroundColor: "white",
                  zIndex: 100,
                }}
              >
                <Col
                  xs={{ span: 24 }}
                  md={{ span: 4 }}
                  style={{ overflowWrap: "break-word" }}
                >
                  <b>Table Name</b>
                </Col>
                <Col
                  xs={{ span: 24 }}
                  md={{ span: 4 }}
                  style={{ overflowWrap: "break-word" }}
                >
                  <b>Column Name</b>
                </Col>
                <Col
                  xs={{ span: 24 }}
                  md={{ span: 4 }}
                  style={{ overflowWrap: "break-word" }}
                >
                  <b>Data Type</b>
                </Col>
                <Col xs={{ span: 24 }} md={{ span: 12 }}>
                  <b>Description (Optional)</b>
                </Col>
              </Row>
            ) : null}
            {metadata.length > 0 &&
              metadata.map((item, index) => {
                return (
                  <Row
                    key={item.table_name + "_" + item.column_name}
                    style={{ marginTop: "1em" }}
                    gutter={16}
                  >
                    <Col
                      xs={{ span: 24 }}
                      md={{ span: 4 }}
                      style={{ overflowWrap: "break-word" }}
                    >
                      {item.table_name}
                    </Col>
                    <Col
                      xs={{ span: 24 }}
                      md={{ span: 4 }}
                      style={{ overflowWrap: "break-word" }}
                    >
                      {item.column_name}
                    </Col>
                    <Col
                      xs={{ span: 24 }}
                      md={{ span: 4 }}
                      style={{ overflowWrap: "break-word" }}
                    >
                      {item.data_type}
                    </Col>
                    <Col xs={{ span: 24 }} md={{ span: 12 }}>
                      <Input.TextArea
                        key={index}
                        placeholder="Description of what this column does"
                        defaultValue={item.column_description || ""}
                        autoSize={{ minRows: 2 }}
                        onChange={(e) => {
                          const newMetadata = [...metadata];
                          newMetadata[index]["column_description"] =
                            e.target.value;
                          setMetadata(newMetadata);
                        }}
                      />
                    </Col>
                  </Row>
                );
              })}
          </Col>
        </Row>
      </Scaffolding>
    </>
  );
};

export default ExtractMetadata;
