import React from "react";
import { Layout, Menu } from "antd/lib";

const Scaffolding = ({ id, children }) => {
  const { Content, Sider } = Layout;
  const items = [
    {
      key: 'select-model',
      title: 'Select Model',
      icon: <a href="/">1. Select Model</a>,
    },
    {
      key: 'extract-metadata',
      title: 'Extract Metadata',
      icon: <a href="/extract-metadata">2. Extract Metadata</a>,
    },
    {
      key: 'instruct-model',
      title: 'Instruct Model',
      icon: <a href="/instruct-model">3. Instruct Model</a>,
    },
    {
      key: 'query-database',
      title: 'Query your database',
      icon: <a href="/query-database">4. Query Database</a>,
    },
  ];
  return (
    <Layout style={{height: "100vh"}}>
      <Content
        style={{
          padding: '50 50',
        }}
      >
        <Sider
          style={{
            height: "100vh",
            position: "fixed",
          }}
        >
          <Menu
            style={{ width: 200, paddingTop: "2em", paddingBottom: "2em" }}
            mode="inline"
            selectedKeys={[id]}
            items={items}
          />
        </Sider>
        <div style={{paddingLeft: 240, paddingTop: 30}}>
          {children}
        </div>
      </Content>
    </Layout>
  );
}

export default Scaffolding;