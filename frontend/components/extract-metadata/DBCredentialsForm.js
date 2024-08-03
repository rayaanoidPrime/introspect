import React, { useState, useEffect } from "react";
import { Form, Select, Input, Button } from "antd";
import setupBaseUrl from "$utils/setupBaseUrl";
import { DatabaseOutlined } from "@ant-design/icons";
const dbCredOptions = {
  postgres: ["host", "port", "user", "password", "database"],
  redshift: ["host", "port", "user", "password", "database", "schema"],
  snowflake: ["account", "warehouse", "user", "password"],
  databricks: ["server_hostname", "access_token", "http_path", "schema"],
  bigquery: [],
};

const placeholders = {
  host: "host.docker.internal",
  port: "543",
  user: "Database User",
  database: "Database Name",
  server_hostname: "Server Hostname",
  access_token: "Access Token",
  http_path: "HTTP Path",
  schema: "Schema",
};

const DbCredentialsForm = ({ token, apiKeyName }) => {
  const [form] = Form.useForm();
  const [dbType, setDbType] = useState("postgres");

  const dbOptions = [
    { value: "postgres", label: "PostgreSQL" },
    { value: "redshift", label: "Amazon Redshift" },
    { value: "snowflake", label: "Snowflake" },
    { value: "databricks", label: "Databricks" },
    { value: "bigquery", label: "Google BigQuery" },
  ];

  const handleDbTypeChange = (value) => {
    setDbType(value);
  };

  useEffect(() => {
    form.resetFields(); // Reset form fields when dbType changes
  }, [dbType, form]);

  const handleSubmit = async (values) => {
    console.log("Received values of form: ", values);
    values = {
      db_creds: values,
      db_type: values["db_type"] || dbType,
      token: token,
      key_name: apiKeyName,
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
      console.log("data", data);
      if (data?.status === "success") {
        message.success("Database Credentials updated successfully!");
      }
      // also get the new list of tables
      await getTables();
    } catch (e) {
      console.log(e);
      message.error(
        "Error fetching tables. Please check your docker logs for more informati)on."
      );
    }
  };

  return (
    <div className="mx-auto bg-white shadow-md rounded-md p-6 mt-8 w-1/2">
      <div className="text-2xl mb-4 text-center">
        <DatabaseOutlined className="text-2xl mr-2" />
        Database Credentials
      </div>
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={{ dbType: "postgres" }}
        layout="vertical"
      >
        <Form.Item name="dbType" label="Database Type">
          <Select options={dbOptions} onChange={handleDbTypeChange} />
        </Form.Item>
        {dbCredOptions[dbType]?.map((field) => (
          <Form.Item
            key={field}
            name={field}
            label={field.charAt(0).toUpperCase() + field.slice(1)}
            rules={[{ required: true, message: `Please input the ${field}!` }]}
          >
            <Input
              type={
                field === "password" || field === "access_token"
                  ? "password"
                  : "text"
              }
              placeholder={
                placeholders?.[field] ? placeholders[field] : `Enter ${field}`
              }
              className="w-full p-2 border rounded bg-gray-50 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Form.Item>
        ))}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Update
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default DbCredentialsForm;
