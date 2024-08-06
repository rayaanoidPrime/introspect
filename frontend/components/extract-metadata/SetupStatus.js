import { Card, Row, Col } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";

const SetupStatus = ({
  loading,
  isDatabaseSetupWell,
  isTablesIndexed,
  hasNonEmptyDescription,
}) => {
  const router = useRouter();

  const statusItems = [
    {
      key: "1",
      title: "Database Setup",
      description: loading ? (
        <LoadingOutlined />
      ) : isDatabaseSetupWell ? (
        "We can verify that your database details are correct and a connection is successfully established"
      ) : (
        "Please fill in your correct database details to get started querying"
      ),
      status: loading ? (
        <LoadingOutlined />
      ) : isDatabaseSetupWell ? (
        <CheckCircleOutlined style={{ color: "green" }} />
      ) : (
        <CloseCircleOutlined style={{ color: "red" }} />
      ),
      onClick: () => router.push("/extract-metadata"),
    },
    {
      key: "2",
      title: "Metadata Setup",
      description: loading ? (
        <LoadingOutlined />
      ) : isTablesIndexed ? (
        "We can verify that at least one table from your database was indexed for defog to generate queries."
      ) : (
        "We did not find any tables indexed for defog to work on. Please index tables to get started."
      ),
      status: loading ? (
        <LoadingOutlined />
      ) : isTablesIndexed ? (
        <CheckCircleOutlined style={{ color: "green" }} />
      ) : (
        <CloseCircleOutlined style={{ color: "red" }} />
      ),
      onClick: () => router.push("/extract-metadata"),
      blur: !isDatabaseSetupWell, // Add blur property
    },
    {
      key: "3",
      title: "Column Descriptions",
      description: loading ? (
        <LoadingOutlined />
      ) : hasNonEmptyDescription ? (
        "We found at least one column with a description. You can view and update metadata."
      ) : (
        "We did not find any column descriptions. Please add descriptions to columns to give defog better context of your data."
      ),
      status: loading ? (
        <LoadingOutlined />
      ) : hasNonEmptyDescription ? (
        <CheckCircleOutlined style={{ color: "green" }} />
      ) : (
        <CloseCircleOutlined style={{ color: "red" }} />
      ),
      onClick: () => router.push("/extract-metadata"),
      blur: !isDatabaseSetupWell, // Add blur property
    },
  ];

  return (
    <div className="py-4">
      <Row gutter={[16, 16]}>
        {statusItems.map((item) => (
          <Col span={8} key={item.key}>
            <div
              className={`${
                item.blur ? "filter blur-sm pointer-events-none opacity-60" : ""
              }`}
            >
              <Card
                hoverable={!item.blur}
                onClick={item.blur ? null : item.onClick}
                title={item.title}
                extra={item.status}
              >
                <p>{item.description}</p>
              </Card>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SetupStatus;
