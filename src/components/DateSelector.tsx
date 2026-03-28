import React from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** 日本時間の「今日」yyyy-MM-dd（これより未来は選べない） */
  todayJST: string;
}

function atJstNoon(dateStr: string): Date {
  return parseISO(`${dateStr}T12:00:00+09:00`);
}

export const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange, todayJST }) => {
  const base = atJstNoon(todayJST);
  const dates = Array.from({ length: 14 }, (_, i) =>
    formatInTimeZone(subDays(base, i), 'Asia/Tokyo', 'yyyy-MM-dd')
  );

  const handlePrev = () => {
    const current = atJstNoon(selectedDate);
    onDateChange(formatInTimeZone(subDays(current, 1), 'Asia/Tokyo', 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const current = atJstNoon(selectedDate);
    const next = formatInTimeZone(subDays(current, -1), 'Asia/Tokyo', 'yyyy-MM-dd');
    if (next <= todayJST) {
      onDateChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              {format(parseISO(`${selectedDate}T12:00:00+09:00`), 'yyyy年MM月dd日')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNext}
            disabled={selectedDate === todayJST}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => onDateChange(date)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedDate === date
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {format(parseISO(`${date}T12:00:00+09:00`), 'M/d')}
          </button>
        ))}
      </div>
    </div>
  );
};
