import React, { useState } from 'react'
import Meta from '../components/common/Meta'
import Scaffolding from '../components/common/Scaffolding'
import { Input, Select, Form, Tooltip, Button, Row, Col, message } from 'antd/lib'

const ExtractMetadata = () => {
  const { Option } = Select;
  const [dbCreds, setDbCreds] = useState({});
  const [tables, setTables] = useState([]);
  const [loading, setLoading]  = useState(false);
  const [metadata, setMetadata] = useState([]);
  const [allowedJoins, setAllowedJoins] = useState("");

  return (
    <>
      <Meta />
      <Scaffolding id={"extract-metadata"}>
        <h1 style={{paddingBottom: "1em"}}>Extract Metadata</h1>
        {/* select database type */}
        
        <Row
          type={"flex"}
          height={"100vh"}
        >
          <Col
            md={{span: 8}}
            xs={{span: 24}}
          >
            <div>
              <Form
                name="db_creds"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{maxWidth: 400}}
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
                  <Select style={{ width: "100%"}} initialValue={"postgres"}>
                    <Option value="postgres">PostgreSQL</Option>
                    <Option value="mysql" disabled>MySQL</Option>
                    <Option value="snowflake" disabled>Snowflake</Option>
                    <Option value="redshift" disabled>Redshift</Option>
                    <Option value="bigquery" disabled>BigQuery</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Database Host" name="host" initialValue={"localhost"}>
                  <Input style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name="port" label="Database Port" initialValue={"5432"}>
                  <Input style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name="username" label="DB Username" initialValue={"postgres"}>
                  <Input style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name="password" label="DB Password" initialValue={"postgres"}>
                  <Input style={{width: "100%"}} />
                </Form.Item>
                <Form.Item name="database" label="DB Name" initialValue={"postgres"}>
                  <Input style={{width: "100%"}} />
                </Form.Item>
                <Form.Item wrapperCol={{ span: 24 }}>
                  <Button type={"primary"} style={{width: "100%"}} htmlType='submit'>Get Tables</Button>
                </Form.Item>
              </Form>

              {tables.length > 0 && (
                <Form
                  name="db_tables"
                  labelCol={{ span: 8 }}
                  wrapperCol={{ span: 16 }}
                  style={{maxWidth: 400}}
                  disabled={loading}
                  onFinish={async (values) => {
                    setLoading(true);
                    const res = await fetch("http://localhost:8000/get_metadata", {
                      method: "POST",
                      body: JSON.stringify({
                        ...dbCreds,
                        tables: values['tables']
                      })
                    });
                    const data = await res.json();
                    setLoading(false);
                    setMetadata(data['schema']);
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
          </Col>

          <Col
            md={{span: 16}}
            xs={{span: 24}}
            style={{paddingRight: "2em", height: 600, overflowY: "scroll"}}
          >
            {metadata.length > 0 && (
              <Button
                type='primary'
                style={{width: "100%", maxWidth: 535}}
                disabled={loading}
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  const res = await fetch("http://localhost:8000/update_metadata", {
                    method: "POST",
                    body: JSON.stringify({
                      metadata: metadata,
                      allowed_joins: allowedJoins
                    })
                  });
                  const data = await res.json();
                  console.log(data);
                  setLoading(false);
                  if (data['suggested_joins'] !== undefined && data['suggested_joins'] !== null && data['suggested_joins'] !== "") {
                    console.log("Here!")
                    setAllowedJoins(data['suggested_joins']);
                    // also update the value of the text area
                    document.getElementById("allowed-joins").value = data['suggested_joins'];
                  }

                  message.success("Metadata updated successfully!");
                }}
              >
                Update metadata on server
              </Button>
            )}
            {metadata.length > 0 ? <Row style={{
              marginTop: "1em",
              position: "sticky",
              top: 0,
              paddingBottom: "1em",
              paddingTop: "1em",
              backgroundColor: "white",
              zIndex: 100
            }}>
              <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                <b>Table Name</b>
              </Col>
              <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                <b>Column Name</b>
              </Col>
              <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                <b>Data Type</b>
              </Col>
              <Col xs={{ span: 24 }} md={{ span: 12 }}>
                <b>Description (Optional)</b>
              </Col>
            </Row> : null}
            {metadata.length > 0 &&
              metadata.map((item, index) => {
                return <Row key={index} style={{marginTop: "1em"}}>
                <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                  {item.table_name}
                </Col>
                <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                  {item.column_name}
                </Col>
                <Col xs={{ span: 24 }} md={{ span: 4 }} style={{overflowWrap: "break-word"}}>
                  {item.data_type}
                </Col>
                <Col xs={{ span: 24 }} md={{ span: 12 }}>
                  <Input.TextArea
                    key={index}
                    placeholder="Description of what this column does"
                    initialValue={item.column_description}
                    autoSize={{minRows: 2}}
                    onKeyDown={async (e) => {
                      // special behavior for cmd+enter
                      if (e.key === 'Enter' && e.metaKey) {
                        const resp = await fetch("http://localhost:8000/make_gguf_request", {
                          method: "POST",
                          body: JSON.stringify({
                            prompt: `# Task\nAdd a column description for the following column inside a SQL table. Only return the column description and nothing else.\n\n# Schema\nTable Name: ${item.table_name}\nColumn Name: ${item.column_name}\nData Type: ${item.data_type}\nColumn Description:`,
                          })
                          })
                        const data = await resp.json();
                        const description = data['completion']
                        // also update the value of the text area
                        e.target.value = description;
                      }
                    }}
                    onChange={(e) => {
                      const newMetadata = [...metadata];
                      newMetadata[index]['column_description'] = e.target.value;
                      setMetadata(newMetadata);
                    }}
                  />
                </Col>
              </Row>
              })
            }

            {metadata.length > 0 ? 
            <Row>
              <Col span={24}>
                <h2 style={{paddingTop: "1em"}}>Allowed Joins</h2>
                <Input.TextArea
                  id={"allowed-joins"}
                  placeholder="Allowed Joins"
                  initialValue={allowedJoins}
                  autoSize={{minRows: 2}}
                  value={allowedJoins}
                  onChange={(e) => {
                    setAllowedJoins(e.target.value);
                  }}
                />
              </Col>
            </Row>: null}
          </Col>
        </Row>
      </Scaffolding>
    </>
  )
}

export default ExtractMetadata;