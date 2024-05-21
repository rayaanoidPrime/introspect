import React, { useState, useEffect, useContext } from "react";
import { Context } from "./Context";
import { Layout, Menu } from "antd/lib";
import { useRouter } from "next/router";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import Link from "next/link";

const Scaffolding = ({ id, userType, children }) => {
  const { Content, Sider } = Layout;
  const [items, setItems] = useState([]);
  const [context, setContext] = useContext(Context);

  const router = useRouter();

  const redirect = (path) => {
    router.push(path);
  };

  const logout = () => {
    localStorage.removeItem("defogUser");
    localStorage.removeItem("defogToken");
    localStorage.removeItem("defogUserType");
    setContext({
      user: null,
      token: null,
      userType: null,
    });

    redirect("/log-in");
  };

  useEffect(() => {
    let items = [];
    if (userType == "admin") {
      items = [
        {
          key: "manage-database",
          title: "Manage Database",
          icon: (
            <a onClick={() => redirect("/extract-metadata")}>
              <p className="mr-2">💾</p>Manage DB
            </a>
          ),
        },
        {
          key: "manage-users",
          title: "Manage Users",
          icon: (
            <a onClick={() => redirect("/manage-users")}>
              <p className="mr-2">🔐</p>Manage Users
            </a>
          ),
        },
        {
          key: "view-notebooks",
          title: "View your notebook",
          icon: (
            <a onClick={() => redirect("/view-notebooks")}>
              <p className="mr-2">📒</p>Your Notebooks
            </a>
          ),
        },
        {
          key: "manage-tools",
          title: "Manage tools",
          icon: (
            <a onClick={() => redirect("/manage-tools")}>
              <p className="mr-2">
                <HiWrenchScrewdriver />
              </p>
              Manage tools
            </a>
          ),
        },
        {
          key: "check-readiness",
          title: "Check Readiness",
          icon: <Link href="/check-readiness">✅ Check Readiness</Link>,
        },
        {
          key: "align-model",
          title: "Align Model",
          icon: <Link href="/align-model">⚙️ Align Model</Link>,
        },
        {
          key: "query-data",
          title: "Query Data",
          icon: <Link href="/query-data">🔍 Query Data</Link>,
        },
        {
          key: "logout",
          title: "Logout",
          icon: (
            <a onClick={logout}>
              <p className="mr-2">↪</p> Logout
            </a>
          ),
        },
      ];
    } else if (!userType) {
      items = [];
    } else {
      items = [
        {
          key: "view-notebooks",
          title: "View your notebook",
          icon: (
            <a onClick={() => redirect("/view-notebooks")}>Your Notebooks</a>
          ),
        },
        {
          key: "query-data",
          title: "Query Data",
          icon: <Link href="/query-data">🔍 Query Data</Link>,
        },
        {
          key: "logout",
          title: "Logout",
          icon: <a onClick={() => redirect("/manage-tools")}>Logout</a>,
        },
      ];
    }
    setItems(items);
  }, [userType]);

  return (
    <Layout style={{ height: "100vh" }}>
      <Content>
        {items.length ? (
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
        ) : (
          <></>
        )}
        <div
          style={{
            paddingLeft: 240,
            paddingTop: 30,
            backgroundColor: "#f5f5f5",
          }}
        >
          {children}
        </div>
      </Content>
    </Layout>
  );
};

export default Scaffolding;
