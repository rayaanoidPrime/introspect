import { useState, useEffect } from "react";
import { Form, Select, Input, Button, Table, message } from "antd";
import { EditOutlined, SaveOutlined, TableOutlined } from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";

const MetadataTable = ({ token, user, userType, apiKeyName, tablesData }) => {
  const [tables, setTables] = useState([]);
  const [selectedTablesForIndexing, setSelectedTablesForIndexing] = useState(
    []
  );
  const [metadata, setMetadata] = useState([]);
  const [editingKey, setEditingKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUpdatedMetadata, setIsUpdatedMetadata] = useState(false);
  const [desc, setDesc] = useState({});

  useEffect(() => {
    if (tablesData) {
      setTables(tablesData.tables);
      setSelectedTablesForIndexing(tablesData.db_tables);
      getMetadata(); // Fetch metadata as soon as tablesData is set
    }
  }, [tablesData]);

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
      setMetadata(data.metadata || []);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await getMetadata();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [apiKeyName]);

  useEffect(() => {
    if (isUpdatedMetadata) {
      const updateMetadata = async () => {
        try {
          setLoading(true);
          const res = await fetch(
            setupBaseUrl("http", `integration/update_metadata`),
            {
              method: "POST",
              body: JSON.stringify({
                metadata: metadata,
                token: token,
                // dev: devMode,
                key_name: apiKeyName,
              }),
            }
          );
          const data = await res.json();
          setLoading(false);
          if (data.error) {
            message.error("Error updating metadata");
          } else {
            if (data.suggested_joins) {
              document.getElementById("allowed-joins").value =
                data.suggested_joins;
            }
            message.success("Metadata updated successfully!");
            setEditingKey("");
          }
        } catch (error) {
          console.error("Error saving data:", error);
          message.error("Error saving data");
          setLoading(false);
        }
      };

      updateMetadata();
      setIsUpdatedMetadata(false);
    }
  }, [isUpdatedMetadata]);

  const handleSave = () => {
    setIsUpdatedMetadata(true);
  };

  const handleEdit = (key) => {
    setEditingKey(key);
  };

  const handleInputChange = (e, key) => {
    const { value } = e.target;
    const newMetadata = metadata.map((item) =>
      `${item.table_name}_${item.column_name}` === key
        ? { ...item, column_description: value }
        : item
    );
    setMetadata(newMetadata);
  };

  const reIndexTables = async (values) => {
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
            tables: values.tables,
            token: token,
            // dev: devMode,
            key_name: apiKeyName,
          }),
        }
      );
      const data = await res.json();
      console.log(data);
      setLoading(false);
      if (data.error) {
        message.error("Error fetching metadata");
      } else {
        data.metadata.forEach((item) => {
          if (desc[item.column_name]) {
            item.column_description = desc[item.column_name];
          }
        });
        setMetadata(data.metadata || []);
      }
    } catch (e) {
      console.log(e);
      setLoading(false);
      message.error(
        "Error fetching metadata - please look at your docker logs for more information."
      );
    }
  };

  const columns = [
    {
      title: "Table Name",
      dataIndex: "table_name",
      key: "table_name",
      width: "20%",
      align: "center",
    },
    {
      title: "Column Name",
      dataIndex: "column_name",
      key: "column_name",
      width: "20%",
      align: "center",
    },
    {
      title: "Data Type",
      dataIndex: "data_type",
      key: "data_type",
      width: "20%",
      align: "center",
    },
    {
      title: "Description",
      dataIndex: "column_description",
      key: "column_description",
      width: "35%",
      align: "center",
      render: (text, record) => {
        return editingKey === record.key ? (
          <Input.TextArea
            defaultValue={text}
            onChange={(e) => handleInputChange(e, record.key)}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        ) : (
          text
        );
      },
    },
    {
      key: "action",
      width: "5%",
      align: "center",
      render: (text, record) => {
        const editable = editingKey === record.key;
        return editable ? (
          <SaveOutlined onClick={handleSave} />
        ) : (
          <EditOutlined onClick={() => handleEdit(record.key)} />
        );
      },
    },
  ];

  const tableData = metadata.map((item) => ({
    key: `${item.table_name}_${item.column_name}`,
    ...item,
  }));

  return (
    <div className="mx-auto bg-white shadow-md rounded-md p-6">
      <div className="text-2xl mb-10 text-center">
        <TableOutlined className="text-2xl mr-2" />
         View and Update Metadata
      </div>
      <Form className="flex flex-row w-full" onFinish={reIndexTables}>
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
            options={(tables || []).map((table) => ({
              value: table,
              label: table,
            }))}
          />
        </Form.Item>
        <Button type="dashed" htmlType="submit" className="w-1/5 ml-2">
          Index Tables
        </Button>
      </Form>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{ pageSize: 10, position: ["bottomCenter"] }}
        scroll={{ y: 700 }}
      />
      <Button
        className="w-full bg-orange-500 text-white py-2 mt-4"
        onClick={handleSave}
        loading={loading}
      >
        Update Metadata on Servers
      </Button>
    </div>
  );
};

export default MetadataTable;
