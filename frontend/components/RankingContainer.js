import { BarChart } from "./BarChart";
import { RankingList } from "./RankingList";
import { Row, Col, Typography } from "antd";

const { Title } = Typography;

export function RankingContainer() {
  return (
    <Row gutter={[8, 8]} justify="space-around">
      <Col span={17} style={{ height: "330px" }}>
        <Title level={5}>Tendencia expedientes</Title>
        <BarChart></BarChart>
      </Col>
      <Col span={7}>
        <RankingList></RankingList>
      </Col>
    </Row>
  );
}
