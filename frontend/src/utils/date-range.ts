import dayjs from "dayjs";
import type { TimeRangePickerProps } from "antd";

// Default to today and yesterday (2 full days)
export const getDefaultDateRange = (): [dayjs.Dayjs, dayjs.Dayjs] => {
  const startDate = dayjs().subtract(1, "day").startOf("day");
  const endDate = dayjs();
  return [startDate, endDate];
};

export const rangePresets: TimeRangePickerProps["presets"] = [
  {
    label: "Hoy y ayer",
    value: () => [dayjs().subtract(1, "day").startOf("day"), dayjs()],
  },
  {
    label: "Ultimas 24 horas",
    value: () => [dayjs().subtract(24, "hour"), dayjs()],
  },
  {
    label: "Ultimos 7 Dias",
    value: () => [dayjs().subtract(7, "day"), dayjs()],
  },
  {
    label: "Ultimos 14 Dias",
    value: () => [dayjs().subtract(14, "day"), dayjs()],
  },
  {
    label: "Ultimos 30 Dias",
    value: () => [dayjs().subtract(30, "day"), dayjs()],
  },
  {
    label: "Ultimos 90 Dias",
    value: () => [dayjs().subtract(90, "day"), dayjs()],
  },
  { label: "Este año", value: () => [dayjs().startOf("year"), dayjs()] },
];
