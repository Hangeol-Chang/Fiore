/**
 * 탭 백그라운드/일시적 네트워크 오류로 업로드 fetch가 끊겨도
 * 자동 재시도해서 저장이 계속 진행되도록 하는 헬퍼.
 */
export async function fetchWithRetry(url, options = {}, retries = 2, backoffMs = 800) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(await res.text());
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/** 미디어 파일 업로드 (실패 시 자동 재시도) → 업로드된 media 객체 반환 */
export async function uploadMediaFile(API, file, category, extra = {}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', category);
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined) fd.append(key, value);
  }
  const res = await fetchWithRetry(`${API}/api/media`, { method: 'POST', body: fd });
  return res.json();
}
