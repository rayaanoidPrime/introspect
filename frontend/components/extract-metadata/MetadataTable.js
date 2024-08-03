import { useState, useEffect } from "react";
import { Form, Select, Input, Button } from "antd";
import { useRouter } from "next/router";
import setupBaseUrl from "$utils/setupBaseUrl";

const MetadataTable = ({ token, user, userType, apiKeyName }) => {
  const router = useRouter();
  // table states
  const [tables, setTables] = useState([]);
  const [selectedTablesForIndexing, setSelectedTablesForIndexing] = useState(
    []
  );
  const [filteredTables, setFilteredTables] = useState([]);

  const [metadata, setMetadata] = useState([]);

  const getTablesAndDbCreds = async () => {
    if (!user || !token || !userType) {
      // redirect to login page
      router.push("/log-in");
      return;
    }
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
      // reset the current values in the db_creds form
      // setDbType(data["db_type"]);
      // setDbCreds(data["db_creds"]);
      setTables(data["tables"]);
      setSelectedTablesForIndexing(data["selected_tables"]);
      // form.setFieldsValue({
      //   db_type: data["db_type"],
      //   ...data["db_creds"],
      //   db_tables: data["selected_tables"],
      // });
    } else {
      // setDbCreds({});
      // setTables([]);
      // setSelectedTablesForIndexing([]);
      // form.setFieldsValue({
      //   db_type: "",
      //   db_tables: [],
      //   host: "",
      //   port: "",
      //   user: "",
      //   password: "",
      //   database: "",
      //   schema: "",
      //   account: "",
      //   warehouse: "",
      //   access_token: "",
      //   server_hostname: "",
      //   http_path: "",
      // });
    }
  };

  const getMetadata = async () => {
    const res = await fetch(setupBaseUrl("http", `integration/get_metadata`), {
      method: "POST",
      body: JSON.stringify({
        token,
        key_name: apiKeyName,
      }),
    });
    const data = await res.json();
    if (!data.error) {
      setMetadata(data?.metadata || []);
    } else {
      //
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await getTablesAndDbCreds();
        await getMetadata();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        // setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleMetadataUpdate = () => ({});

  return (
    <div className="my-10">
      <Form className="flex flex-row w-full " onFinish={handleMetadataUpdate}>
        <Form.Item
          className="w-4/5"
          label="Select tables"
          name="tables"
          initialValue={selectedTablesForIndexing}
        >
          <Select
            mode="tags"
            placeholder="Add tables to index"
            onChange={setSelectedTablesForIndexing}
            options={tables.map((table) => ({ value: table, label: table }))}
          />
        </Form.Item>
        <Button
          type="dashed"
          htmlType="submit"
          className="w-1/5 ml-2"
          // loading={loading}
        >
          Index Tables
        </Button>
      </Form>
      {/* {metadata.length > 0 && (
        <>
          <div className="sticky top-0 bg-white py-2 shadow-md grid grid-cols-4 gap-4 font-bold">
            <div className="border-r-2 p-2">
              Table Name
              <Select
                mode="tags"
                className="w-full mt-2"
                placeholder="Filter"
                onChange={setFilteredTables}
                options={tables.map((table) => ({
                  value: table,
                  label: table,
                }))}
              />
            </div>
            <div className="p-2 border-r-2">Column Name</div>
            <div className="p-2 border-r-2">Data Type</div>
            <div className="p-2">Description (Optional)</div>
          </div>
          {metadata.map((item, index) => {
            if (
              filteredTables.length > 0 &&
              !filteredTables.includes(item.table_name)
            ) {
              return null;
            }
            return (
              <div
                key={item.table_name + "_" + item.column_name}
                className={`py-4 grid grid-cols-4 gap-4 ${index % 2 === 1 ? "bg-gray-100" : ""}`}
              >
                <div className="p-2 border-r-2">{item.table_name}</div>
                <div className="p-2 border-r-2">{item.column_name}</div>
                <div className="p-2 border-r-2">{item.data_type}</div>
                <div className="p-2">
                  <Input.TextArea
                    placeholder="Description of what this column does"
                    defaultValue={item.column_description || ""}
                    autoSize={{ minRows: 2 }}
                    onChange={(e) => {
                      const newMetadata = [...metadata];
                      newMetadata[index].column_description = e.target.value;
                      setMetadata(newMetadata);
                    }}
                  />
                </div>
              </div>
            );
          })}
          <Button
            className="w-full bg-orange-500 text-white py-2 mt-4"
            // onClick={handleUpdateMetadataOnServers}
            // loading={loading}
          >
            Update Metadata on Servers
          </Button>
        </> */}
      {metadata.length > 0 && (
        <>
          <div className="sticky top-0 bg-white py-2 shadow-md grid grid-cols-4 gap-4 font-bold">
            <div className="border-r-2 p-2">
              Table Name
              <Select
                mode="tags"
                className="w-full mt-2"
                placeholder="Filter"
                onChange={setFilteredTables}
                options={tables.map((table) => ({
                  value: table,
                  label: table,
                }))}
              />
            </div>
            <div className="p-2 border-r-2">Column Name</div>
            <div className="p-2 border-r-2">Data Type</div>
            <div className="p-2">Description (Optional)</div>
          </div>
          <div className="overflow-y-auto max-h-screen">
            {" "}
            {/* Adjust the max height as needed */}
            {metadata.map((item, index) => {
              if (
                filteredTables.length > 0 &&
                !filteredTables.includes(item.table_name)
              ) {
                return null;
              }
              return (
                <div
                  key={item.table_name + "_" + item.column_name}
                  className={`py-4 grid grid-cols-4 gap-4 ${index % 2 === 1 ? "bg-gray-100" : ""}`}
                >
                  <div className="p-2 border-r-2">{item.table_name}</div>
                  <div className="p-2 border-r-2">{item.column_name}</div>
                  <div className="p-2 border-r-2">{item.data_type}</div>
                  <div className="p-2">
                    <Input.TextArea
                      placeholder="Description of what this column does"
                      defaultValue={item.column_description || ""}
                      autoSize={{ minRows: 2 }}
                      onChange={(e) => {
                        const newMetadata = [...metadata];
                        newMetadata[index].column_description = e.target.value;
                        setMetadata(newMetadata);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className="w-full bg-orange-500 text-white py-2 mt-4"
            // onClick={handleUpdateMetadataOnServers}
            // loading={loading}
          >
            Update Metadata on Servers
          </Button>
        </>
      )}
    </div>
  );
};

export default MetadataTable;
