// 空ボディやHTMLでも落ちないパース
export async function safeJson<T = any>(res: Response): Promise<T | null> {
  const text = await res.text();        // まずテキストで受ける
  if (!text) return null;               // 空なら null
  try { return JSON.parse(text) as T; } // JSONならオブジェクト
  catch { return null; }                // JSONでなければ null
}

export function ensureOk(data: any, res: Response, fallbackMsg = "request failed") {
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}` || fallbackMsg;
    throw new Error(msg);
  }
}
