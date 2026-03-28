import React from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarClock, Bookmark } from "lucide-react";

interface TodayHeroProps {
  /** 表示中の日付 yyyy-MM-dd（JST基準の文字列） */
  activeDate: string;
  /** 日本時間の今日 */
  todayJST: string;
  /** null = 本日モード（日付は毎日自動で切り替わる） */
  archiveDate: string | null;
  onBackToToday: () => void;
}

export const TodayHero: React.FC<TodayHeroProps> = ({
  activeDate,
  todayJST,
  archiveDate,
  onBackToToday,
}) => {
  const isToday = activeDate === todayJST;
  const d = parseISO(`${activeDate}T12:00:00+09:00`);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
            <CalendarClock className="w-4 h-4" />
            {archiveDate === null ? "本日モード（自動）" : "記録の閲覧"}
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {format(d, "yyyy年M月d日（E）", { locale: ja })}
          </p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {isToday ? (
              <>
                ブックマークは{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">
                  このページのURL
                </code>{" "}
                だけでOKです。日付が変わると自動で「その日」のニュースを読み込みます（約5分ごとに再取得）。
              </>
            ) : (
              <>過去に保存された調査結果を表示しています。</>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {archiveDate !== null && (
            <button
              type="button"
              onClick={onBackToToday}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm"
            >
              今日のニュースに戻る
            </button>
          )}
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Bookmark className="w-3.5 h-3.5" />
            常に <span className="font-mono text-gray-500">/</span> を開く運用向け
          </p>
        </div>
      </div>
    </div>
  );
};
