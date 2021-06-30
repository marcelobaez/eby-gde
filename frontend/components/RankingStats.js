import { Anchor, Card, DatePicker, Space, Divider } from "antd";
import { useState } from "react";
import { endOfToday } from "date-fns";
import { RankingContainer } from "./RankingContainer";

const { RangePicker } = DatePicker;
const { Link } = Anchor;

const tabListNoTitle = [
  {
    key: "exp",
    tab: "Expedientes",
  },
  {
    key: "docs",
    tab: "Documentos",
  },
];

const contentListNoTitle = {
  exp: <RankingContainer></RankingContainer>,
  docs: <p>Docs</p>,
};

const disabledDate = (current) => {
  // No estan permitidas fechas futuras
  return current && current > endOfToday();
};

const HeaderContent = () => {
  return (
    <Space size="middle" split={<Divider type="vertical" />}>
      <a href="#today">Hoy</a>
      <a href="#week">Esta semana</a>
      <a href="#month">Este mes</a>
      <RangePicker format="DD/MM/YYYY" disabledDate={disabledDate} />
    </Space>
  );
};

export const RankingStats = () => {
  const [noTitleKey, setKey] = useState("exp");

  const handleTabChange = (key) => {
    setKey(key);
  };

  return (
    <Card
      style={{ width: "100%" }}
      tabList={tabListNoTitle}
      activeTabKey={noTitleKey}
      tabBarExtraContent={<HeaderContent />}
      onTabChange={handleTabChange}
    >
      {contentListNoTitle[noTitleKey]}
    </Card>
  );
};
