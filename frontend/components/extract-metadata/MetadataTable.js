import { useState, useEffect } from "react";
import { Form, Select, Input, Button, Table, message, Spin } from "antd";
import { EditOutlined, SaveOutlined, TableOutlined } from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";

const MetadataTable = ({ token, user, userType, apiKeyName, tablesData }) => {
  const [tables, setTables] = useState([]);
  const [selectedTablesForIndexing, setSelectedTablesForIndexing] = useState([]);
  const [metadata, setMetadata] = useState([]);
  const [filteredMetadata, setFilteredMetadata] = useState([]);
  const [editingKey, setEditingKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUpdatedMetadata, setIsUpdatedMetadata] = useState(false);
  const [desc, setDesc] = useState({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (tablesData) {
      setTables(tablesData.tables);
      setSelectedTablesForIndexing(tablesData.db_tables);
      getMetadata(); // Fetch metadata as soon as tablesData is set
    }
  }, [tablesData]);

  const getMetadata = async () => {
    setLoading(true);
    const res = await fetch(setupBaseUrl("http", `integration/get_metadata`), {
      method: "POST",
      body: JSON.stringify({
        token,
        key_name: apiKeyName,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.error) {
      setMetadata(data.metadata || []);
      setFilteredMetadata(data.metadata || []);
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
              document.getElementById("allowed-joins").value = data.suggested_joins;
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
            key_name: apiKeyName,
          }),
        }
      );
      const data = await res.json();
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
        setFilteredMetadata(data.metadata || []);
      }
    } catch (e) {
      console.log(e);
      setLoading(false);
      message.error(
        "Error fetching metadata - please look at your docker logs for more information."
      );
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    if (value) {
      setFilteredMetadata(metadata.filter((item) => item.table_name.includes(value)));
    } else {
      setFilteredMetadata(metadata);
    }
  };

  // Extract unique table names from metadata
  const uniqueTableNames = [...new Set(metadata.map(item => item.table_name))];

  const columns = [
    {
      title: (
        <div>
          <div>Table Name</div>
          <Select
            showSearch
            placeholder="Filter tables"
            optionFilterProp="children"
            onChange={handleFilterChange}
            className="w-full mt-1"
            options={uniqueTableNames.map((table) => ({
              value: table,
              label: table,
            }))}
          />
        </div>
      ),
      dataIndex: "table_name",
      key: "table_name",
      width: "20%",
      align: "center",
      render: (text) => <span className="font-bold">{text}</span>,
    },
    {
      title: "Column Name",
      dataIndex: "column_name",
      key: "column_name",
      width: "20%",
      align: "center",
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "Data Type",
      dataIndex: "data_type",
      key: "data_type",
      width: "20%",
      align: "center",
      render: (text) => <span className="font-mono">{text}</span>,
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
          <span className="italic p-1">{text}</span>
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

  const tableData = filteredMetadata.map((item) => ({
    key: `${item.table_name}_${item.column_name}`,
    ...item,
  }));

  return (
    <div className="mx-auto bg-white shadow-md rounded-md p-6">
      <div className="flex flex-col items-center text-2xl mb-10">
        <TableOutlined className="text-4xl mb-2" />
        <span>View and Update Metadata</span>
      </div>
      <Form className="flex flex-row w-full mb-4" onFinish={reIndexTables}>
        <Form.Item
          className="w-3/4"
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
        <Button type="dashed" htmlType="submit" className="w-1/4 ml-2">
          Index Tables
        </Button>
      </Form>
      {loading ? (
        <div className="flex justify-center items-center">
          <Spin size="large" tip="Fetching metadata..." />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={{ pageSize: 10, position: ["bottomCenter"] }}
          scroll={{ y: 700 }}
        />
      )}
    </div>
  );
};

export default MetadataTable;
