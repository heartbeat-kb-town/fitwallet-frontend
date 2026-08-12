/**
 * 매장 QR(MPM) 페이로드를 읽는다.
 *
 * QR 에는 두 가지 모양이 들어온다. **금액이 실려 오는 쪽이 정상이고, 평문은 옛 데모용이다.**
 *
 *   1. JSON  `{"storeQrToken":"FITWALLET-QR-00020","amount":4500}`  ← 지금 쓰는 형식
 *   2. 평문  `FITWALLET-QR-00020`                                    ← 금액이 없다
 *
 * 2번은 금액을 사용자에게 받아야 하므로 `amount` 를 `null` 로 돌려준다.
 * 화면이 그 둘을 갈라 처리한다(`PaymentView.handleScanned`).
 *
 * 토큰 형식(`FITWALLET-QR-#####`)은 **여기서 검사하지 않는다.** 백엔드가 정규식으로 막고
 * `QR_TOKEN_INVALID` / `STORE_NOT_FOUND` 로 답하는데, 그 판정을 두 군데 두면 갈라진다.
 *
 * @param raw 스캐너가 읽은 문자열
 * @returns `{ storeQrToken, amount }` — 읽을 수 없으면 `storeQrToken` 이 빈 문자열
 */
export function parseStoreQr(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return { storeQrToken: '', amount: null }

  // JSON 이 아니면 평문 토큰으로 본다. 던지지 않고 조용히 넘어간다 —
  // 남의 QR 을 찍는 것은 오류가 아니라 흔한 일이고, 그 판정은 백엔드가 한다.
  if (!text.startsWith('{')) return { storeQrToken: text, amount: null }

  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    return { storeQrToken: text, amount: null }
  }

  const token = typeof payload?.storeQrToken === 'string' ? payload.storeQrToken.trim() : ''

  return { storeQrToken: token, amount: toAmount(payload?.amount) }
}

/**
 * QR 이 실어 온 금액을 결제에 쓸 수 있는 수로 바꾼다.
 *
 * 0 이하·숫자 아님·빠짐은 전부 `null` 이다. **`null` 이면 사용자에게 금액을 받는다.**
 * 백엔드가 `@Positive` 로 막으므로(`StoreQrScanRequest`) 0 을 그대로 보내면 400 이 난다.
 */
function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}
