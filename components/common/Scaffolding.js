import React, { useState, useEffect } from "react";
import { Layout, Menu } from "antd/lib";

const Scaffolding = ({ id, userType, children }) => {
  const { Content, Sider } = Layout;
  const [items, setItems] = useState([]);
  useEffect(() => {
    let items = [];
    if (userType == "admin") {
      items = [
        {
          key: 'manage-database',
          title: 'Manage Database',
          icon: <a href="/extract-metadata">💾 Manage DB</a>,
        },
        {
          key: 'manage-users',
          title: 'Manage Users',
          icon: <a href="/manage-users">🔐 Manage Users</a>,
        },
        {
          key: 'manage-model',
          title: 'Instruct Model',
          icon: <a href="/instruct-model">👨‍🏫 Instruct Model</a>,
        },
        {
          key: 'view-notebook',
          title: 'View your notebook',
          icon: <a href="/view-notebooks">📒 Your Notebooks</a>,
        },
        {
          key: 'account',
          title: 'Update Account',
          icon: <a href="/account">🧾 Update Account</a>,
        },
      ];
    } else {
      items = [
        {
          key: 'view-notebook',
          title: 'View your notebook',
          icon: <a href="/view-notebooks">Your Notebooks</a>,
        },
        {
          key: 'account',
          title: 'Update Account',
          icon: <a href="/account">Update Account</a>,
        },
      ]
    }
    setItems(items);
  }, [userType]);

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