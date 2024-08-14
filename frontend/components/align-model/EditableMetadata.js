import React, { useState, useEffect } from "react";
import { Table, Input, Button, Popconfirm, Form, message } from "antd";

const EditableCell = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          <Input />;
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const MetadataEditor = ({ metadata, onUpdate }) => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [editingKey, setEditingKey] = useState("");

  useEffect(() => {
    const formattedData = Object.entries(metadata).flatMap(([key, columns]) =>
      columns.map((col) => ({
        key: `${key}-${col.column_name}`,
        tableName: key,
        columnName: col.column_name,
        dataType: col.data_type,
        description: col.column_description,
      }))
    );
    setData(formattedData);
  }, [metadata]);

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      ...record,
      description: record.description,
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...data];
      const index = newData.findIndex((item) => key === item.key);

      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setData(newData);
        setEditingKey("");
      } else {
        newData.push(row);
        setData(newData);
        setEditingKey("");
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const handleUpdateMetadata = () => {
    // This function should handle the logic to update metadata based on the current state of `data`.
    // Call the onUpdate function with the new data
    onUpdate(data);
    message.success("Metadata updated successfully!");
  };

  const columns = [
    {
      title: "Table Name",
      dataIndex: "tableName",
      width: "20%",
      editable: false,
    },
    {
      title: "Column Name",
      dataIndex: "columnName",
      width: "20%",
      editable: false,
    },
    {
      title: "Data Type",
      dataIndex: "dataType",
      width: "20%",
      editable: false,
    },
    {
      title: "Description",
      dataIndex: "description",
      width: "30%",
      editable: true,
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <a
              href="#!"
              onClick={() => save(record.key)}
              style={{
                marginRight: 8,
              }}
            >
              Save
            </a>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <a>Cancel</a>
            </Popconfirm>
          </span>
        ) : (
          <a disabled={editingKey !== ""} onClick={() => edit(record)}>
            Edit
          </a>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.dataIndex === "description" ? "text" : "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <div className="w-full p-4">
      <h1 className="text-xl mb-3 font-semibold">Metadata</h1>
      <p className="mb-4 text-gray-700">
        These are the suggested descriptions for each column in the database.
        You can edit them below before updating the metadata.
      </p>
      <Form form={form} component={false}>
        <Table
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={data}
          columns={mergedColumns}
          rowClassName="editable-row"
          pagination={{
            position: ["bottomCenter"],
          }}
          footer={() => (
            <Button
              type="primary"
              className="mt-4 p-2 min-w-56"
              onClick={handleUpdateMetadata}
            >
              Update Metadata
            </Button>
          )}
        />
      </Form>
    </div>
  );
};

export default MetadataEditor;
