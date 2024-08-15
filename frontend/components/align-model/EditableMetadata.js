import { useState, useEffect } from "react";
import {
  EditOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  CloseSquareOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";
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
        <Form.Item name={dataIndex} className="m-0">
          <Input />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const MetadataEditor = ({ title, description, metadata, updateMetadata }) => {
  const [form] = Form.useForm();
  const [currentData, setCurrentData] = useState([]);
  const [editingKey, setEditingKey] = useState("");

  const [updatingMetadata, setUpdatingMetadata] = useState(false);

  useEffect(() => {
    const formattedData = Object.entries(metadata).flatMap(([key, columns]) =>
      columns.map((col) => ({
        key: `${key}-${col.column_name}`,
        table_name: key,
        column_name: col.column_name,
        data_type: col.data_type,
        column_description: col.column_description,
      }))
    );
    setCurrentData(formattedData);
  }, [metadata]);

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      table_name: record.table_name,
      column_name: record.column_name,
      data_type: record.data_type,
      column_description: record.column_description,
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...currentData];
      const index = newData.findIndex((item) => key === item.key);

      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setCurrentData(newData);
        setEditingKey("");
      } else {
        newData.push(row);
        setCurrentData(newData);
        setEditingKey("");
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const columns = [
    {
      title: "Table Name",
      dataIndex: "table_name",
      width: "20%",
      editable: false,
    },
    {
      title: "Column Name",
      dataIndex: "column_name",
      width: "20%",
      editable: false,
    },
    {
      title: "Data Type",
      dataIndex: "data_type",
      width: "15%",
      editable: false,
    },
    {
      title: "Description",
      dataIndex: "column_description",
      width: "35%",
      editable: true,
    },
    {
      title: "",
      dataIndex: "action",
      width: "10%",
      align: "center",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <SaveOutlined onClick={() => save(record.key)} className="mr-3" />
            <RollbackOutlined onClick={cancel} />
          </span>
        ) : (
          <EditOutlined
            disabled={editingKey !== ""}
            onClick={() => edit(record)}
          />
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
    <div className="w-full p-4 bg-gray-50">
      <h1 className="text-xl mb-3 font-semibold">{title}</h1>
      <p className="mb-4 text-gray-700">{description}</p>
      <Form form={form} component={false}>
        <Table
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={currentData}
          columns={mergedColumns}
          rowClassName="editable-row"
          pagination={{
            position: ["bottomCenter"],
          }}
          footer={() => (
            <Button
              type="primary"
              className="mt-4 p-2 min-w-56"
              onClick={async () =>
                await updateMetadata(currentData, setUpdatingMetadata)
              }
              disabled={updatingMetadata}
            >
              {updatingMetadata ? "Updating Metadata" : "Update Metadata"}
            </Button>
          )}
        />
      </Form>
    </div>
  );
};

export default MetadataEditor;
