import React, { useState } from 'react'
import Meta from '@/components/common/Meta'
import Scaffolding from '@/components/common/Scaffolding'
import { Input, Select, Form, Tooltip, Button } from 'antd/lib'

const ExtractMetadata = () => {
  const { Option } = Select;
  const [form] = Form.useForm();

  const [dbCreds, setDbCreds] = useState({});
  const [tables, setTables] = useState([]);
  const [loading, setLoading]  = useState(false);

  form.setFieldsValue({
    db_type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres"
  });

  return (
    <>
      <Meta />
      <Scaffolding id={"extract-metadata"}>
        <h1 style={{paddingBottom: "1em"}}>Extract Metadata</h1>
        {/* select database type */}
        <div style={{paddingBottom: "1em"}}>
          <Form
            form={form}
            name="db_creds"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            style={{maxWidth: 800}}
            disabled={loading}
            onFinish={async (values) => {
              setDbCreds(values);
              const res = await fetch("http://localhost:8000/get_tables", {
                method: "POST",
                body: JSON.stringify(values)
              });
              const data = await res.json();
              setTables(data['tables']);
            }}
          >
            <Form.Item name="db_type" label={<div>Database Type <Tooltip title="only postgres is supported on the community model">ℹ</Tooltip></div>}>
              <Select style={{ width: "100%", maxWidth: 400 }}>
                <Option value="postgres">PostgreSQL</Option>
                <Option value="mysql" disabled>MySQL</Option>
                <Option value="snowflake" disabled>Snowflake</Option>
                <Option value="redshift" disabled>Redshift</Option>
                <Option value="bigquery" disabled>BigQuery</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Database Host" name="host">
              <Input style={{width: "100%", maxWidth: 400}} />
            </Form.Item>
            <Form.Item name="port" label="Database Port">
              <Input style={{width: "100%", maxWidth: 400}} />
            </Form.Item>
            <Form.Item name="username" label="DB Username">
              <Input style={{width: "100%", maxWidth: 400}} />
            </Form.Item>
            <Form.Item name="password" label="DB Password">
              <Input style={{width: "100%", maxWidth: 400}} />
            </Form.Item>
            <Form.Item name="database" label="DB Name">
              <Input style={{width: "100%", maxWidth: 400}} />
            </Form.Item>
            <Form.Item wrapperCol={{ span: 24 }}>
              <Button type={"primary"} style={{width: "100%", maxWidth: 535}} htmlType='submit'>Get Tables</Button>
            </Form.Item>
          </Form>

          {tables.length > 0 && (
            <Form
              name="db_tables"
              labelCol={{ span: 4 }}
              wrapperCol={{ span: 20 }}
              style={{maxWidth: 800}}
              disabled={loading}
              onFinish={async (values) => {
                setLoading(true);
                const res = await fetch("http://localhost:8000/extract_metadata", {
                  method: "POST",
                  body: JSON.stringify({
                    ...dbCreds,
                    tables: values['tables']
                  })
                });
                const data = await res.json();
                setLoading(false);
                console.log(data);
              }}
            >
              <Form.Item name="tables" label="Tables to index">
                <Select mode="multiple" style={{ width: "100%", maxWidth: 400 }}>
                  {tables.map((table) => (
                    <Option value={table}>{table}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item wrapperCol={{ span: 24 }}>
                <Button type="primary" style={{width: "100%", maxWidth: 535}} htmlType='submit'>Extract Metadata</Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Scaffolding>
    </>
  )
}

export default ExtractMetadata;