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
 * 가맹점 단말이 없어서 백엔드가 PENDING 3초 뒤 스캔된 척 `SCANNED` 로 바꿔준다.
 * **`SCANNED` 다음은 이 API 가 아니라 `getPaymentResult` 가 굴린다** (아래 참고).
 *
 * `paymentId` 를 함께 주므로 결과 조회로 넘어갈 때 그대로 쓴다.
 *
 *   - 404 QR_NOT_FOUND : 없는 세션
 *   - 410 QR_EXPIRED : 만료됐다. QR 을 다시 만들어야 한다
 */
export const getQrStatus = (qrToken) => client.get(`/payment/qr/${qrToken}/status`)

/**
 * 결제 결과 조회.
 *
 * ⚠️ **이름과 달리 조회만 하지 않는다. 부를 때마다 결제 상태가 전진한다**
 * (`DefaultPaymentService.getPaymentResult`).
 *
 *   SCANNED    → PROCESSING 으로 바꾸고 PROCESSING 반환
 *   PROCESSING → 2초 지났으면 90% COMPLETED · 10% FAILED
 *   COMPLETED  → 결제 내역(payment_transaction)을 기록하고 결과 반환
 *
 * **그래서 이걸 부르지 않으면 결제가 영원히 끝나지 않고 DB 에도 남지 않는다.**
 * 가맹점 단말이 없는 동안의 임시 구조이고, 승인 API(backend#140)가 생기면 그쪽으로 옮겨간다.
 *
 * @param paymentId 폴링 응답의 `paymentId`. **숫자가 아니라 문자열이다**
 * @returns `{ paymentId, paymentTransactionId, status, storeName, paymentMethod,
 *             amount, expectedBenefitAmount, paidAt, failReason }`
 *
 * 완료 전에는 `status` 와 `paymentId` 만 채워져 오고 나머지는 비어 있다.
 *
 *   - 404 PAYMENT_NOT_FOUND : 내 결제가 아니거나 없는 세션
 */
export const getPaymentResult = (paymentId) => client.get(`/payment/${paymentId}/result`)

/** 폴링으로 받은 status 를 화면이 분기할 때 쓴다. 문자열을 화면에 흩어놓지 않는다. */
export const QR_STATUS = {
  PENDING: 'PENDING',
  SCANNED: 'SCANNED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
}
