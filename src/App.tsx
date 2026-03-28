import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { format, parseISO, isAfter, setHours, setMinutes } from 'date-fns';
import { NewsItem, DailyNews, QuizSet } from './types';
import { fetchInternationalNews, fetchJapanNews, fetchGenerateQuiz } from './services/geminiService';
import { NewsCard } from './components/NewsCard';
import { DateSelector } from './components/DateSelector';
import { TodayHero } from './components/TodayHero';
import { QuizPanel } from './components/QuizPanel';
import { useTodayJST } from './hooks/useTodayJST';
import { syncArchiveDateToUrl, readArchiveDateFromUrl } from './utils/dateUrl';
import { Globe, Zap, Loader2, AlertCircle, RefreshCw, Flag, ClipboardCheck, ChevronDown } from 'lucide-react';

function quizHasContent(q: QuizSet): boolean {
  return q.beginner.length + q.intermediate.length + q.advanced.length > 0;
}

function dailyHasQuiz(d: DailyNews): boolean {
  return !!(d.quiz && quizHasContent(d.quiz));
}

export default function App() {
  const todayJST = useTodayJST();
  /** null のときは常に「日本時間の今日」に追従（同じURLで毎日更新） */
  const [archiveDate, setArchiveDate] = useState<string | null>(null);
  const [urlHydrated, setUrlHydrated] = useState(false);

  const activeDate = archiveDate ?? todayJST;

  const [dailyNews, setDailyNews] = useState<DailyNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [fetchStep, setFetchStep] = useState<'news' | 'quiz'>('news');
  const [quizBusy, setQuizBusy] = useState(false);

  const activeDateRef = useRef(activeDate);
  activeDateRef.current = activeDate;

  useEffect(() => {
    const t = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    const fromUrl = readArchiveDateFromUrl(t);
    setArchiveDate(fromUrl && fromUrl !== t ? fromUrl : null);
    setUrlHydrated(true);
  }, []);

  useEffect(() => {
    if (!urlHydrated) return;
    syncArchiveDateToUrl(archiveDate, todayJST);
  }, [archiveDate, todayJST, urlHydrated]);

  const fetchDailyNews = useCallback(
    async (date: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      setIsAutoFetching(false);
      try {
        const response = await fetch(`/api/news?date=${date}`);
        if (!response.ok) throw new Error('Failed to fetch news from server');
        const data = await response.json();

        if (data) {
          setDailyNews(data);
        } else {
          setDailyNews(null);
          const todayStr = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
          if (date === todayStr) {
            const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
            const nineAMJST = setMinutes(setHours(nowJST, 9), 0);
            if (isAfter(nowJST, nineAMJST)) {
              setIsAutoFetching(true);
              handleFetchNewsRef.current?.();
            }
          }
        }
      } catch (err) {
        console.error('API error', err);
        if (!opts?.silent) {
          setError('ニュースの読み込みに失敗しました。');
        }
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  const handleFetchNewsRef = useRef<() => Promise<void>>(async () => {});

  const handleFetchNews = async () => {
    if (isFetching) return;
    const date = activeDateRef.current;
    setIsFetching(true);
    setFetchStep('news');
    if (!isAutoFetching) setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchInternationalNews(date),
        new Promise<NewsItem[]>(async (resolve, reject) => {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const res = await fetchJapanNews(date);
            resolve(res);
          } catch (e) {
            reject(e);
          }
        }),
      ]);

      const intlItems = results[0].status === 'fulfilled' ? results[0].value : [];
      const jpItems = results[1].status === 'fulfilled' ? results[1].value : [];

      if (results[0].status === 'rejected') console.error('International news fetch failed', results[0].reason);
      if (results[1].status === 'rejected') console.error('Japan news fetch failed', results[1].reason);

      if (intlItems.length > 0 || jpItems.length > 0) {
        let quiz: QuizSet | undefined;
        try {
          setFetchStep('quiz');
          const generated = await fetchGenerateQuiz(intlItems, jpItems);
          if (quizHasContent(generated)) {
            quiz = generated;
          }
        } catch (qe) {
          console.error('Quiz generation failed', qe);
        }

        const newDailyNews: DailyNews = {
          date,
          internationalItems: intlItems,
          japanItems: jpItems,
          createdAt: new Date().toISOString(),
          ...(quiz ? { quiz } : {}),
        };

        const saveResponse = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDailyNews),
        });

        if (!saveResponse.ok) throw new Error('Failed to save news to server');
        setDailyNews(newDailyNews);
      } else {
        setError('ニュースが見つかりませんでした。');
      }
    } catch (e) {
      console.error('Fetch error', e);
      setError('ニュースの取得に失敗しました。');
    } finally {
      setIsFetching(false);
      setIsAutoFetching(false);
      setLoading(false);
      setFetchStep('news');
    }
  };

  handleFetchNewsRef.current = handleFetchNews;

  useEffect(() => {
    if (!urlHydrated) return;
    fetchDailyNews(activeDate);
  }, [activeDate, urlHydrated, fetchDailyNews]);

  useEffect(() => {
    if (!urlHydrated || archiveDate !== null) return;
    const id = window.setInterval(() => {
      const d = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
      fetchDailyNews(d, { silent: true });
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [archiveDate, urlHydrated, fetchDailyNews]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || archiveDate !== null) return;
      const d = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
      fetchDailyNews(d, { silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [archiveDate, fetchDailyNews]);

  const handleGenerateQuizOnly = async () => {
    if (!dailyNews || quizBusy || isFetching) return;
    const intl = dailyNews.internationalItems ?? [];
    const jp = dailyNews.japanItems ?? [];
    if (intl.length === 0 && jp.length === 0) return;

    setQuizBusy(true);
    setError(null);
    try {
      const quiz = await fetchGenerateQuiz(intl, jp);
      if (!quizHasContent(quiz)) {
        setError('テスト問題を生成できませんでした。');
        return;
      }
      const updated: DailyNews = { ...dailyNews, quiz };
      const saveResponse = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!saveResponse.ok) throw new Error('Failed to save quiz');
      setDailyNews(updated);
    } catch (e) {
      console.error(e);
      setError('テスト問題の生成に失敗しました。');
    } finally {
      setQuizBusy(false);
    }
  };

  const onBackToToday = () => {
    setArchiveDate(null);
  };

  const onPickArchiveDate = (d: string) => {
    setArchiveDate(d === todayJST ? null : d);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              ENERGY NEWS DAILY
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 font-bold">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>毎日同じURLで最新のエネルギー情勢を</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="lg:col-span-3 space-y-8 sm:space-y-12">
            <TodayHero
              activeDate={activeDate}
              todayJST={todayJST}
              archiveDate={archiveDate}
              onBackToToday={onBackToToday}
            />

            <details className="group bg-gray-100/80 border border-gray-200 rounded-xl p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between font-bold text-gray-800 text-sm">
                <span>過去の記録を選ぶ（任意）</span>
                <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <DateSelector
                  selectedDate={activeDate}
                  todayJST={todayJST}
                  onDateChange={onPickArchiveDate}
                />
              </div>
            </details>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">
                  {fetchStep === 'quiz'
                    ? 'テスト問題を作成中...'
                    : isAutoFetching
                      ? '朝9時を過ぎたため、本日のニュースを自動調査中...'
                      : 'エネルギー情勢を調査中...'}
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 sm:p-10 text-center">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900 mb-2">エラーが発生しました</h3>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                  onClick={handleFetchNews}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> 再調査を実行
                </button>
              </div>
            ) : dailyNews ? (
              <div className="space-y-12 sm:space-y-16">
                <section>
                  <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900">日本のエネルギー制度設計</h2>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Japan Energy Policy & Market Design</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {dailyNews.japanItems?.map((item, idx) => (
                      <NewsCard key={`jp-${idx}`} item={item} />
                    ))}
                    {(!dailyNews.japanItems || dailyNews.japanItems.length === 0) && (
                      <p className="text-gray-400 italic text-center py-8">日本のニュースは見つかりませんでした。</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900">国際エネルギー情勢</h2>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">International Energy News</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {dailyNews.internationalItems?.map((item, idx) => (
                      <NewsCard key={`intl-${idx}`} item={item} />
                    ))}
                    {(!dailyNews.internationalItems || dailyNews.internationalItems.length === 0) && (
                      <p className="text-gray-400 italic text-center py-8">国際ニュースは見つかりませんでした。</p>
                    )}
                  </div>
                </section>

                {dailyNews.quiz && quizHasContent(dailyNews.quiz) && (
                  <QuizPanel quiz={dailyNews.quiz} />
                )}

                {!dailyHasQuiz(dailyNews) &&
                  ((dailyNews.internationalItems?.length ?? 0) > 0 ||
                    (dailyNews.japanItems?.length ?? 0) > 0) && (
                    <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="w-8 h-8 text-violet-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-black text-violet-900 text-lg">テスト問題がまだありません</h3>
                          <p className="text-sm text-violet-800/90 mt-1">
                            本日の調査内容から、初心者・中級・上級の4択問題を自動生成できます。
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={quizBusy}
                        onClick={handleGenerateQuizOnly}
                        className="shrink-0 inline-flex items-center justify-center px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 shadow-md"
                      >
                        {quizBusy ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          'テスト問題を生成'
                        )}
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-10 sm:p-20 text-center">
                <Globe className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 mx-auto mb-8 opacity-50" />
                <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-6">調査を開始してください</h3>
                <p className="text-blue-700 mb-10 max-w-lg mx-auto text-sm sm:text-lg font-medium leading-relaxed">
                  {format(parseISO(`${activeDate}T12:00:00+09:00`), 'M月d日')}
                  の「国際ニュース」と「日本の制度設計ニュース」を調査します。
                  AIが世界中の情報を収集し、日本語で詳細にまとめます。
                </p>
                <button
                  onClick={handleFetchNews}
                  disabled={isFetching}
                  className="inline-flex items-center px-10 py-4 sm:px-12 sm:py-5 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 transform hover:-translate-y-1"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" /> 調査中...
                    </>
                  ) : (
                    '合計20件のニュースを調査する'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                調査項目
              </h3>
              <div className="space-y-6">
                <section>
                  <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">日本国内</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    電力システム改革、容量市場、需給調整市場、再エネ賦課金、託送料金、エネルギー基本計画など。
                  </p>
                </section>
                <section>
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">国際情勢</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    原油・ガス価格、地政学リスク、欧米のエネルギー政策、脱炭素技術、原子力、水素エネルギーなど。
                  </p>
                </section>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg">
              <Zap className="w-8 h-8 mb-4 text-yellow-400" />
              <h3 className="text-xl font-black mb-2">同じURLで毎日更新</h3>
              <p className="text-sm text-blue-100 leading-relaxed">
                トップのURLをブックマークしておけば、開くたびに日本時間の「その日」のキャッシュを表示します。タブを開き直したときも最新を取りに行きます。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
            © 2026 Energy News Daily. Powered by Gemini 3.0 Flash.
          </p>
        </div>
      </footer>
    </div>
  );
}
