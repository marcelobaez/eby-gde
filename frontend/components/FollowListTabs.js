import { Button, Tabs } from "antd";
import { PlusOutlined, FolderOutlined } from "@ant-design/icons";
import { EmptyItems } from "./EmptyItems";
import { ModalCreateList } from "./ModalCreateList";
import { SearchExpContainer } from "./SearchExpContainer";
import { useState } from "react";

const { TabPane } = Tabs;

export function FollowListTabs({ data }) {
  return (
    <Tabs>
      <TabPane
        tab={
          <span>
            <FolderOutlined />
            {data[0].titulo}
          </span>
        }
        key={0}
      >
        <SearchExpContainer data={data[0].expedientes} />
      </TabPane>
    </Tabs>
  );
}
