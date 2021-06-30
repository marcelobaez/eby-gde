import { List, Avatar } from "antd";

const data = [
  {
    title: "Ant Design Title 1",
  },
  {
    title: "Ant Design Title 2",
  },
  {
    title: "Ant Design Title 3",
  },
  {
    title: "Ant Design Title 4",
  },
  {
    title: "Ant Design Title 1",
  },
  {
    title: "Ant Design Title 2",
  },
  {
    title: "Ant Design Title 3",
  },
];

export function RankingList() {
  return (
    <List
      itemLayout="horizontal"
      dataSource={data}
      size="small"
      split={false}
      renderItem={(item, idx) => (
        <List.Item>
          <List.Item.Meta
            avatar={<Avatar size="small">{idx + 1}</Avatar>}
            title={<a href="https://ant.design">{item.title}</a>}
          />
          <div>content</div>
        </List.Item>
      )}
    />
  );
}
