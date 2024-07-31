// components/MetadataTable.js
import React from "react";
import { Form, Select, Input, Button } from "antd";

const MetadataTable = ({
  metadata,
  setMetadata,
  tables,
  selectedTablesForIndexing,
  setSelectedTablesForIndexing,
  filteredTables,
  setFilteredTables,
  handleMetadataUpdate,
  loading,
  handleUpdateMetadataOnServers,
}) => {
  return (
    <div className="my-10">
      <Form className="w-full" onFinish={handleMetadataUpdate}>
        <Form.Item
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
          type="primary"
          htmlType="submit"
          className="w-full bg-blue-500 text-white py-2"
          loading={loading}
        >
          Index Tables
        </Button>
      </Form>
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
            onClick={handleUpdateMetadataOnServers}
            loading={loading}
          >
            Update Metadata on Servers
          </Button>
        </>
      )}
    </div>
  );
};

export default MetadataTable;
