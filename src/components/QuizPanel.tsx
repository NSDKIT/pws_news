import React, { useState } from "react";
import type { QuizQuestion, QuizSet } from "../types";
import { ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

type Difficulty = "beginner" | "intermediate" | "advanced";

const TABS: { id: Difficulty; label: string; desc: string }[] = [
  { id: "beginner", label: "初心者", desc: "基礎・用語" },
  { id: "intermediate", label: "中級者", desc: "制度・因果" },
  { id: "advanced", label: "上級者", desc: "応用・統合" },
];

interface QuizPanelProps {
  quiz: QuizSet;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({ quiz }) => {
  const [tab, setTab] = useState<Difficulty>("beginner");
  const [selected, setSelected] = useState<Record<string, number | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const questions = quiz[tab];
  const totalQuestions =
    quiz.beginner.length + quiz.intermediate.length + quiz.advanced.length;

  if (totalQuestions === 0) {
    return null;
  }

  const keyOf = (d: Difficulty, i: number) => `${d}-${i}`;

  const toggleReveal = (d: Difficulty, i: number) => {
    const k = keyOf(d, i);
    setRevealed((r) => ({ ...r, [k]: !r[k] }));
  };

  const correctCountForTab = (d: Difficulty) => {
    const qs = quiz[d];
    return qs.reduce((acc, q, i) => {
      const k = keyOf(d, i);
      return selected[k] === q.correctIndex ? acc + 1 : acc;
    }, 0);
  };

  return (
    <section className="border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-violet-600 px-4 sm:px-6 py-4 flex items-center gap-3">
        <ClipboardCheck className="w-7 h-7 text-violet-100 shrink-0" />
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            理解度チェック
          </h2>
          <p className="text-violet-200 text-xs font-medium">
            本日の調査内容に基づく4択テスト（各難易度10問）
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const n = quiz[t.id].length;
            const correct = correctCountForTab(t.id);
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all border-2 ${
                  active
                    ? "bg-violet-600 text-white border-violet-600 shadow-md"
                    : "bg-white text-violet-800 border-violet-200 hover:border-violet-400"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs font-normal opacity-90">
                  ({n === 0 ? "—" : `${correct}/${n}`})
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 font-medium">{TABS.find((x) => x.id === tab)?.desc}</p>

        <div className="space-y-6">
          {questions.length === 0 ? (
            <p className="text-gray-400 text-center py-6">この難易度の問題はありません。</p>
          ) : (
            questions.map((q: QuizQuestion, idx: number) => {
              const k = keyOf(tab, idx);
              const show = revealed[k];
              const picked = selected[k];

              return (
                <div
                  key={k}
                  className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
                >
                  <p className="font-bold text-gray-900 mb-4 leading-snug">
                    <span className="text-violet-600 mr-2">Q{idx + 1}.</span>
                    {q.question}
                  </p>
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          picked === oi
                            ? "border-violet-400 bg-violet-50"
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={k}
                          className="mt-1 accent-violet-600"
                          checked={picked === oi}
                          onChange={() => setSelected((s) => ({ ...s, [k]: oi }))}
                        />
                        <span className="text-sm text-gray-800 leading-relaxed">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReveal(tab, idx)}
                    className="inline-flex items-center gap-1 text-sm font-bold text-violet-700 hover:text-violet-900"
                  >
                    {show ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> 解説を閉じる
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> 正解・解説を見る
                      </>
                    )}
                  </button>
                  {show && (
                    <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                      <p className="font-bold text-emerald-900 mb-1">
                        正解: {q.options[q.correctIndex]}
                      </p>
                      <p className="text-emerald-800 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
