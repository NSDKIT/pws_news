import { useState, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";

/** 日本時間の「今日」yyyy-MM-dd。1分ごとに更新し、日付跨ぎを検知します */
export function useTodayJST(): string {
  const [day, setDay] = useState(() =>
    formatInTimeZone(new Date(), "Asia/Tokyo", "yyyy-MM-dd")
  );

  useEffect(() => {
    const tick = () => {
      setDay(formatInTimeZone(new Date(), "Asia/Tokyo", "yyyy-MM-dd"));
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return day;
}
