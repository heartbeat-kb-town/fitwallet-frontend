import client from './client'

/**
 * 결제 도메인 API.
 *
 * 결제는 세 걸음이다. 앞 걸음의 결과가 다음 걸음의 입력이라 순서를 건너뛸 수 없다.
 *
 *   1. PIN 검증  → pinAuthId 를 받는다 (180초, 한 번 쓰면 소모)
 *   2. QR 생성   → pinAuthId 를 내고 qrToken 을 받는다 (180초)
 *   3. 상태 폴링 → qrToken 으로 가맹점이 스캔했는지 확인한다
 */

/**
 * 결제 비밀번호 검증.
 *
 * @param payload `{ userCardId, paymentPin }` — `paymentPin` 은 숫자 6자리 문자열
 * @returns `{ pinAuthId, expiresIn }`
 *
 * 실패는 인터셉터가 ApiError 로 감싸서 던진다.
 *   - 401 PIN_MISMATCH : 비밀번호 불일치. **세션 만료가 아니다** (#79).
 *                        `error.data.remainingAttempts` 에 남은 횟수가 온다 (5회 제한)
 *   - 400 INVALID_INPUT_VALUE : 6자리가 아니거나 카드를 안 골랐다
 */
export const postPinVerify = ({ userCardId, paymentPin }) =>
  client.post('/payment/pin/verify', { userCardId, paymentPin })

/**
 * QR 결제 세션 생성.
 *
 * @param payload `{ userCardId, pinAuthId }`
 * @returns `{ qrToken, status, expiresIn }` — status 는 항상 PENDING 으로 시작한다
 *
 *   - 400 PIN_AUTH_ID_INVALID : 인증이 만료됐거나 이미 썼다. PIN 입력부터 다시 받는다
 *   - 404 CARD_NOT_FOUND : 내 카드가 아니다
 */
export const postQr = ({ userCardId, pinAuthId }) =>
  client.post('/payment/qr', { userCardId, pinAuthId })

/**
 * QR 세션 상태 조회. 결제가 진행됐는지 폴링으로 확인한다.
 *
 * @returns `{ status, paymentId }`
 *
 * status 는 `PENDING` → `SCANNED` → `PROCESSING` → `COMPLETED` (+ `EXPIRED` / `FAILED`).
 *
 * ⚠️ 백엔드는 **SCANNED 까지만 구현돼 있다.** 가맹점 단말이 없어서 PENDING 3초 뒤
 *    스캔된 척 바꿔주는 것이 전부고, PROCESSING·COMPLETED 로 바꾸는 코드는 없다.
 *    그래서 화면은 SCANNED 를 결제 진행 신호로 쓰고 그 뒤는 아직 목이다.
 *
 *   - 404 QR_NOT_FOUND : 없는 세션
 *   - 410 QR_EXPIRED : 만료됐다. QR 을 다시 만들어야 한다
 */
export const getQrStatus = (qrToken) => client.get(`/payment/qr/${qrToken}/status`)

/** 폴링으로 받은 status 를 화면이 분기할 때 쓴다. 문자열을 화면에 흩어놓지 않는다. */
export const QR_STATUS = {
  PENDING: 'PENDING',
  SCANNED: 'SCANNED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
}
