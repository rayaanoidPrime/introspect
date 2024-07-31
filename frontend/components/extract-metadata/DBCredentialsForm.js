import { Form, Select, Input, Button } from "antd";

const DbCredentialsForm = ({
  form,
  dbType,
  setDbType,
  dbCredOptions,
  handleUpdateDbCredentials,
  loading,
}) => {
  return (
    <div className="w-full md:w-1/2 mb-10">
      <Form
        form={form}
        onFinish={handleUpdateDbCredentials}
        initialValues={{ db_type: dbType }}
      >
        <Form.Item label="DB Type" name="db_type">
          <Select
            onChange={setDbType}
            options={[
              { value: "databricks", label: "Databricks" },
              { value: "postgres", label: "Postgres" },
              { value: "redshift", label: "Redshift" },
              { value: "snowflake", label: "Snowflake" },
              { value: "bigquery", label: "BigQuery" },
            ]}
          />
        </Form.Item>
        {dbCredOptions[dbType]?.map((item) => (
          <Form.Item key={item} label={item} name={item}>
            {item === "password" ? <Input.Password /> : <Input />}
          </Form.Item>
        ))}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="w-full bg-blue-500 text-white py-2"
            loading={loading}
          >
            Update DB Credentials
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default DbCredentialsForm;
