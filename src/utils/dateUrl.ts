/** アーカイブ閲覧時のみ ?date=YYYY-MM-DD を付与。本日モードではクエリを消してブックマークしやすくする */
export function syncArchiveDateToUrl(archiveDate: string | null, todayJST: string): void {
  const url = new URL(window.location.href);
  if (!archiveDate || archiveDate === todayJST) {
    url.searchParams.delete("date");
  } else {
    url.searchParams.set("date", archiveDate);
  }
  const next = url.pathname + url.search + url.hash;
  if (next !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState({}, "", next);
  }
}

export function readArchiveDateFromUrl(todayJST: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("date");
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  if (raw > todayJST) return null;
  return raw;
}
