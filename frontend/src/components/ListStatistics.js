import { Col, Statistic } from "antd";
import { getCountDelayed, getCountOnTime } from "../utils";

export function ListStatistics({ movs }) {
  return (
    <>
      <Col span={6}>
        <Statistic title="Siguiendo" value={movs.length} />
      </Col>
      <Col span={6}>
        <Statistic
          title="En término"
          valueStyle={{ color: "#389e0d" }}
          value={getCountOnTime(movs)}
        />
      </Col>
      <Col span={6}>
        <Statistic
          title="Fuera de término"
          valueStyle={{ color: "#cf1322" }}
          value={getCountDelayed(movs)}
        />
      </Col>
    </>
  );
}
