import { Col, Statistic } from "antd";
import { getCountDelayed, getCountOnTime } from "../utils";
import { ExtendedLista } from "@/lib/fetchers";

export function ListStatistics({ movs }: { movs: ExtendedLista[] }) {
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
