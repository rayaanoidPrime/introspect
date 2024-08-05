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
  isMetadataSetup,
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
      ) : isMetadataSetup ? (
        "We can verify that your database details are correct and a connection is sucessfully established"
      ) : (
        "Please fill in your database details before you can start querying"
      ),
      status: loading ? (
        <LoadingOutlined />
      ) : isMetadataSetup ? (
        <CheckCircleOutlined style={{ color: "green" }} />
      ) : (
        <CloseCircleOutlined style={{ color: "red" }} />
      ),
      onClick: () => router.push("/extract-metadata"),
    },
    {
      key: "3",
      title: "Empty Column Descriptions",
      description: "Check for columns with empty descriptions in the metadata",
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
      {/* <h2 style={{ textAlign: 'center', marginBottom: '1em' }}>
        <Tooltip title="Check the status of database and metadata setup">
          <ToolOutlined style={{ marginRight: '0.5em', fontSize: '1.2em', color: '#1890ff', cursor: 'pointer' }} />
        </Tooltip>
        Setup Status
      </h2> */}
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
