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
  emptyDescriptions,
}) => {
  const router = useRouter();

  const statusItems = [
    {
      key: "1",
      title: "Database Setup",
      description: loading ? (
        <LoadingOutlined />
      ) : isDatabaseSetupWell ? (
        "We can verify that your database details are correct and a connection is sucessfully established"
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
    },
    {
      key: "3",
      title: "Column Descriptions",
      description: "We found ",
      status: loading ? (
        <LoadingOutlined />
      ) : emptyDescriptions === 0 ? (
        <CheckCircleOutlined style={{ color: "green" }} />
      ) : (
        <CloseCircleOutlined style={{ color: "red" }} />
      ),
      onClick: () => router.push("/extract-metadata"),
    },
  ];

  return (
    <div style={{ padding: "1em 0" }}>
      <Row gutter={[16, 16]}>
        {statusItems.map((item) => (
          <Col span={8} key={item.key}>
            <Card
              hoverable
              onClick={item.onClick}
              title={item.title}
              extra={item.status}
            >
              <p>{item.description}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SetupStatus;
