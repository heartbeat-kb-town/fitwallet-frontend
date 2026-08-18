<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import iconHome from '@/assets/icons/home.svg'
import iconPaymentActive from '@/assets/icons/payment-selected.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconReport from '@/assets/icons/report.svg'
import waitingPig from '@/assets/icons/pig-waiting.svg'
import completePig from '@/assets/icons/pig-thorwcard.svg'
import cryPig from '@/assets/icons/pig-cry.svg'
import pickPig from '@/assets/icons/pig-pickcard.svg'

import * as paymentApi from '@/api/paymentApi'
import { QR_STATUS } from '@/api/paymentApi'
import BaseModal from '@/components/common/BaseModal.vue'
import { useCardImage } from '@/composables/useCardImage'
import { useQrScanner } from '@/composables/useQrScanner'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { parseStoreQr } from '@/utils/storeQr'

// QR 만료가 180초인데 그 안에 스캔을 놓치면 안 된다. 백엔드가 3초 뒤 스캔된 척 바꿔주므로
// 1초면 충분히 잡히고, 세션당 최대 180번이라 부담도 크지 않다.
const QR_POLL_INTERVAL_MS = 1000

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()

const { markCardImageOrientation, cardImageStyle } = useCardImage()

// `.payment-card` 는 344×198 이라 실제 카드(약 1.58)보다 넓다.
// 세로 이미지를 눕힐 때는 카드가 아니라 **칸** 의 비율을 기준으로 키워야 칸이 채워진다.
const PAYMENT_CARD_RATIO = 344 / 198
const paymentStore = usePaymentStore()
const { showToast } = useToast()

// 진입 시점의 맥락을 고정한다. 화면이 떠 있는 동안 store 가 바뀌어도 흔들리지 않게.
const merchantName = paymentStore.merchantName
const startPhase = paymentStore.startPhase
const paymentReturnTo = paymentStore.returnTo
// 가맹점에서 고른 카드. QR 을 만들 때 쓰므로 카드 목록보다 먼저 필요하다.
const merchantCardId = paymentStore.cardId

function goHome() {
  router.push({ name: 'home' })
}

// 돌아올 주소를 통째로 넘긴다 (#61).
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: route.fullPath } })
}

function goToMyCard() {
  router.push({ name: 'my-card' })
}

function openReport() {
  router.push({ name: 'report' })
}

// 가맹점에서 진입한 결제 → 결제했던 가게의 피그의 PICK 화면으로 복원.
function backToMerchant() {
  const target = router.resolve(paymentReturnTo || { name: 'merchants' })
  router.push({ path: target.path, query: { ...target.query, store: merchantName } })
}

const cards = computed(() => cardStore.cards)
const activeIndex = ref(0)

// 가맹점에서 카드를 고르고 넘어왔으면 그 카드를 펼쳐 놓는다.
// 목록은 API 로 오므로 setup 시점에는 아직 비어 있다. 도착한 뒤에 한 번만 맞춘다.
watch(
  cards,
  (list) => {
    if (!list.length || !paymentStore.cardId) return
    const index = list.findIndex((card) => card.id === paymentStore.cardId)
    if (index >= 0) activeIndex.value = index
  },
  { immediate: true },
)
const pointerStartY = ref(null)
const pointerMoved = ref(false)
const locked = ref(false)
const phase = ref('cards')
const pin = ref([])
const shakePin = ref(false)
const secondsLeft = ref(180)
const paidAt = ref('')
// PIN 입력창 아래 인라인 메시지. 검증 실패는 토스트로 띄우지 않는다 —
// 어느 입력이 문제인지 알려주지 못하고, 시트가 떠 있어 토스트가 가린다.
const pinMessage = ref('')
const qrToken = ref('')

// QR 상태 폴링이 함께 준다. 결과 조회의 열쇠다 (숫자가 아니라 문자열).
const paymentId = ref('')

/**
 * 결제 결과. 완료 화면의 영수증이 전부 여기서 온다 (#122).
 *
 * 예전에는 금액과 혜택이 하드코딩(8,000원 · 1,200원)이었고 가맹점명이 없으면
 * "스타벅스 강남점" 으로 떨어졌다. 지어낸 숫자를 영수증에 적지 않는다.
 */
const paymentResult = ref(null)

/**
 * 결제 실패 팝업.
 *
 * 백엔드 목 구현이 **10% 확률로 승인을 거절한다**(`MOCK_SUCCESS_RATE = 0.9`).
 * 시연 중에도 열 번에 한 번은 여기로 오므로 화면이 반드시 있어야 한다.
 *
 * 전체 화면이 아니라 팝업이고, 닫으면 결제 비밀번호부터 다시 받는다.
 */
const isPaymentFailed = ref(false)

/**
 * 결제 정보확인 화면에 띄울 값. **매장 QR 을 스캔(MPM)했을 때만 쓴다** (#130).
 *
 * 내 QR 을 보여주는 결제(CPM)에는 확인 단계가 없다. 가맹점 단말이 금액을 이미 갖고 있고,
 * 백엔드도 PROCESSING 응답에 `storeName` · `amount` 를 안 실어줘서
 * (`DefaultPaymentService:132`) 두 칸이 `-` 로 뜨는 화면이었다. 확인할 것이 없는 확인이다.
 *
 * 채우는 곳은 `submitScan` 하나다. `POST /payment/qr/scan` 응답이 `storeName` 과 `amount` 를
 * 실제로 준다(`StoreQrScanResponse`).
 * **금액을 화면에서 지어내지 않는다.** 확인 화면에 가짜 금액을 적으면 확인이 아니게 된다.
 */
const confirmInfo = ref(null)

/**
 * 영수증에 적을 매장·금액. **스캔한 값이 있으면 결과 응답보다 그것을 앞세운다** (#136).
 *
 * 백엔드가 결제를 굴리는 첫 걸음에서 세션의 매장·금액을 CPM 용 목값(스타벅스 세종대점 /
 * 4,500원)으로 덮어쓴다(`DefaultPaymentService:136` → `PaymentMapper.xml:83`).
 * MPM 세션은 이미 진짜 값을 갖고 있는데도 덮인다. 그대로 그리면 **바로 앞에서 확인한 금액과
 * 완료 화면이 어긋난다** — 확인의 의미가 사라진다.
 *
 * `confirmInfo` 는 매장 QR 스캔에서만 채워진다. CPM 은 `null` 이라 결과 응답으로 떨어지고,
 * 그쪽은 목값이 정상 동작이다(가맹점 단말이 없어 백엔드가 지어내는 값이다).
 *
 * ⚠️ **이것으로 다 해결되지 않는다.** 백엔드는 덮어쓴 금액으로 혜택과 `payment_transaction`
 * 을 만들기 때문에(`completeAndBuildResponse`), 아래 `receivedBenefit` 과 결제 내역·리포트는
 * 여전히 4,500원 기준이다. 완전한 해결은 백엔드 수정이다.
 */
const receiptStoreName = computed(
  () => confirmInfo.value?.storeName ?? paymentResult.value?.storeName ?? merchantName ?? '-',
)
const receiptAmount = computed(() => confirmInfo.value?.amount ?? paymentResult.value?.amount)

/**
 * 매장 QR 스캔(MPM) 단계 (#130).
 *
 * `POST /payment/qr` 와 `POST /payment/qr/scan` 은 `users.pin_auth_id` **컬럼 하나**를
 * 함께 쓴다. 예전에는 QR 화면에 들어온 순간 그 표가 타버려서 여기 오려면 PIN 을 한 번 더
 * 받아야 했지만, 백엔드가 소비 시점을 결제 완료로 옮겨(backend#185) 재입력이 사라졌다.
 * 이제 두 결제수단을 탭으로 오갈 수 있다.
 */
const scannedToken = ref('')
const scanAmount = ref('')
const scanMessage = ref('')

/**
 * 금액 입력창을 띄워야 하나. **QR 에 금액이 없을 때만 true 다** (#134).
 *
 * `scannedToken` 만으로는 못 가른다 — 금액이 실린 QR 도 토큰을 채우기 때문에,
 * 그것만 보면 곧장 결제가 나가는 동안 입력창이 한 번 번쩍인다.
 */
const needsAmountInput = ref(false)
const videoRef = ref(null)

const { error: scannerError, start: startScanner, stop: stopScanner } = useQrScanner()

/** PIN 시트를 왜 띄웠는지. 같은 시트를 CPM 개시와 스캔 재인증이 함께 쓴다. */
const pinPurpose = ref('qr')

let countdownTimer
let phaseTimer
let pollTimer
let resultTimer

/** 결제 중 화면을 최소 이만큼은 보여준다. 백엔드가 PROCESSING 을 붙잡는 시간과 맞췄다. */
const PROCESSING_MIN_MS = 2000
let processingStartedAt = 0

const activeCard = computed(() => cards.value[activeIndex.value])

/** 결제로 받은 혜택. 응답 필드명은 `expectedBenefitAmount` 지만 완료 시점에는 확정된 값이다. */
const receivedBenefit = computed(() => Number(paymentResult.value?.expectedBenefitAmount) || 0)

/** 금액 표기. 값이 없으면 0 원이 아니라 빈 표시로 둔다 — 0 원 결제와 구분되어야 한다. */
function won(value) {
  if (value == null) return '-'
  return `${Number(value).toLocaleString('ko-KR')}원`
}
const countdownText = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = String(secondsLeft.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

/**
 * 카드 더미에서 이 카드가 앉을 자리. 0 이 맨 앞이고 숫자가 커질수록 뒤다.
 *
 * **`style.css` 에 `.slot-0` ~ `.slot-3` 만 있다.** 그보다 큰 자리는 규칙이 없어
 * `.payment-card` 의 `left: 50%` 만 남고 `translateX(-50%)` 가 빠진다 —
 * 카드가 가운데로 안 오고 오른쪽으로 삐져나온다.
 *
 * 보유 카드가 5장이면 직전 카드가 바로 그 자리(4)에 앉아서, 카드를 넘길 때마다
 * 오른쪽에 살짝 걸쳐 보였다. `slot-3` 이 숨김 자리(`opacity: 0`)이므로
 * 그보다 뒤는 전부 거기로 몰아 맨 뒤에 숨긴다.
 */
const LAST_SLOT = 3

function cardSlot(index) {
  const slot = (index - activeIndex.value + cards.value.length) % cards.value.length
  return Math.min(slot, LAST_SLOT)
}

function advanceCard() {
  if (locked.value || !cards.value.length) return
  locked.value = true
  activeIndex.value = (activeIndex.value + 1) % cards.value.length
  window.setTimeout(() => {
    locked.value = false
  }, 520)
}

function selectCard(index) {
  if (index === activeIndex.value || locked.value) return
  activeIndex.value = index
  locked.value = true
  window.setTimeout(() => {
    locked.value = false
  }, 520)
}

function onPointerDown(event) {
  pointerStartY.value = event.clientY
  pointerMoved.value = false
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (pointerStartY.value === null) return
  if (Math.abs(event.clientY - pointerStartY.value) > 8) {
    pointerMoved.value = true
  }
}

function onPointerUp(event) {
  if (pointerStartY.value === null) return
  const distance = event.clientY - pointerStartY.value
  pointerStartY.value = null
  if (!pointerMoved.value || distance < -36) {
    advanceCard()
  }
}

function resetPointer() {
  pointerStartY.value = null
}

/**
 * PIN 시트를 연다.
 *
 * @param purpose `'qr'` 이면 검증 뒤 CPM 세션을 만들고, `'scan'` 이면 매장 QR 스캔으로 간다.
 *   같은 시트를 둘이 함께 쓰므로 어느 쪽인지 남겨둬야 `confirmPin` 이 갈래를 고를 수 있다.
 */
function openPin(purpose = 'qr') {
  pinPurpose.value = purpose
  pin.value = []
  pinMessage.value = ''
  phase.value = 'pin'
}

/**
 * 실패 팝업의 "뒤로 가기". 팝업을 닫고 **그때** 결제 비밀번호부터 다시 받는다.
 *
 * 표는 실패 시점에 이미 버렸으므로(`pollPaymentResult` 의 FAILED 분기) 새로 받아야 한다.
 */
function closePaymentFailure() {
  isPaymentFailed.value = false
  openPin()
}

/** 정보확인 화면의 "결제 하러가기". 결과 폴링을 다시 돌려 결제를 마무리한다. */
function confirmPayment() {
  phase.value = 'processing'
}

/** PIN 검증과 QR 생성은 한 동작이다. 둘 중 하나라도 돌고 있으면 키패드를 막는다. */
const isSubmittingPin = computed(() => paymentStore.isVerifyingPin || paymentStore.isCreatingQr)

/**
 * 6자리를 채우면 **자동으로 검증이 나간다** (#130).
 *
 * 6자리는 그 자체로 입력 완료 신호다. `완료` 를 한 번 더 누를 이유가 없어 버튼을 뺐다.
 */
function addDigit(digit) {
  if (isSubmittingPin.value || pin.value.length >= 6) return

  pin.value.push(digit)
  if (pin.value.length === 6) confirmPin()
}

function deleteDigit() {
  if (isSubmittingPin.value) return
  pin.value.pop()
}

function shakePinDots() {
  shakePin.value = false
  requestAnimationFrame(() => {
    shakePin.value = true
    window.setTimeout(() => {
      shakePin.value = false
    }, 460)
  })
}

async function confirmPin() {
  if (pin.value.length !== 6) {
    shakePinDots()
    return
  }
  // 목록이 아직 안 왔으면 고른 카드가 없다. 보낼 userCardId 가 없으니 진행하지 않는다.
  if (!activeCard.value) return
  if (isSubmittingPin.value) return

  const userCardId = activeCard.value.id
  pinMessage.value = ''
  try {
    await paymentStore.verifyPin({ userCardId, paymentPin: pin.value.join('') })

    // 스캔하려고 다시 받은 PIN 이면 QR 을 만들지 않는다. 만들면 방금 받은 표를 또 태운다.
    if (pinPurpose.value === 'scan') {
      phase.value = 'scan'
      return
    }
    await startQrSession(userCardId)
  } catch (error) {
    handlePinError(error)
  }
}

/**
 * `QR Scan` 탭을 눌렀다. 매장 QR 을 찍는 흐름으로 갈아탄다.
 *
 * CPM 세션은 여기서 버린다. 만료되게 두면 그만이고, 되돌아오려면 어차피 새로 만들어야 한다.
 */
function startScanFlow() {
  clearFlowTimers()
  clearScanState()

  // 인증표가 살아 있으면 그대로 쓴다. 백엔드가 CPM QR 을 만든 시점에 표를 소모하지 않으므로
  // (backend#185) 여기서 PIN 을 다시 받을 이유가 없다.
  //
  // 결제 탭에 들어오자마자 이 탭을 누르면 표가 아직 없다. 그때는 한 번 받아야 한다.
  if (paymentStore.pinAuthId) {
    // 표가 도중에 만료돼 PIN 을 다시 받게 되면 그 뒤로 스캔이 이어져야 한다.
    pinPurpose.value = 'scan'
    phase.value = 'scan'
    return
  }
  openPin('scan')
}

/**
 * `QR Code` 탭. 매장 QR 스캔에서 내 QR 을 보여주는 결제(CPM)로 되돌아간다.
 *
 * **세션을 새로 만든다.** 스캔으로 갈아타는 동안 카운트다운이 멈춰 있어 남은 시간을 믿을 수
 * 없고, 백엔드 세션은 그동안에도 만료를 향해 간다. 멈춘 숫자를 그대로 이어 붙이면 화면은
 * 아직 여유가 있다고 말하는데 실제로는 죽은 QR 을 보여주게 된다.
 *
 * 인증표는 결제 완료 전까지 살아 있으므로(backend#185) PIN 을 다시 받지 않는다.
 * 만료됐다면 `startQrSession` 이 `PIN_AUTH_ID_INVALID` 를 받아 PIN 부터 다시 받는다.
 */
async function startQrCodeFlow() {
  clearFlowTimers()
  stopScanner()
  clearScanState()

  // 표가 만료돼 PIN 을 다시 받는 경우, 그 뒤로 QR 생성이 이어져야 한다.
  pinPurpose.value = 'qr'

  const userCardId = activeCard.value?.id ?? merchantCardId
  if (!userCardId) {
    phase.value = 'cards'
    return
  }
  await startQrSession(userCardId)
}

/** 두 탭을 오갈 때마다 스캔 흔적을 지운다. 남겨두면 카메라 대신 지난 결과가 뜬다. */
function clearScanState() {
  scannedToken.value = ''
  scanAmount.value = ''
  scanMessage.value = ''
  needsAmountInput.value = false
}

/** 스캔 화면에서 뒤로. 카메라를 반드시 끄고 나간다. */
function cancelScan() {
  stopScanner()
  scannedToken.value = ''
  scanAmount.value = ''
  scanMessage.value = ''
  needsAmountInput.value = false
  phase.value = 'cards'
}

/**
 * 매장 QR 을 읽었다.
 *
 * **금액이 QR 에 실려 있으면 사용자에게 묻지 않고 곧장 결제를 개시한다** (#134).
 * 매장이 요청한 금액을 사용자가 고쳐 칠 수 있으면 안 되고, 데모에서도 군더더기다.
 * 확인은 다음 단계인 "결제 정보를 확인하세요" 가 맡는다 — 여기서 결제가 끝나지 않는다.
 *
 * 금액이 없는 옛 평문 QR(`FITWALLET-QR-#####`)만 입력 화면으로 떨어진다.
 */
function handleScanned(value) {
  const { storeQrToken, amount } = parseStoreQr(value)

  // 토큰이 없으면 우리 QR 이 아니다. 금액만 있어도 결제할 수 없으니 바로 다시 찍게 한다.
  if (!storeQrToken) {
    rescan()
    scanMessage.value = '피그 가맹점 QR 이 아니에요. 다시 찍어 주세요.'
    return
  }

  scannedToken.value = storeQrToken
  scanMessage.value = ''
  needsAmountInput.value = amount === null

  if (amount !== null) submitScan(amount)
}

/**
 * 스캔 결제를 개시한다. 성공하면 정보확인 화면으로 넘어간다.
 *
 * @param scannedAmount QR 이 실어 온 금액. 없으면 입력창 값을 쓴다.
 */
async function submitScan(scannedAmount = null) {
  const amount = scannedAmount ?? Number(scanAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    scanMessage.value = '결제 금액을 입력해 주세요.'
    return
  }
  if (paymentStore.isScanningStoreQr) return

  try {
    const result = await paymentStore.scanStoreQr({
      storeQrToken: scannedToken.value,
      userCardId: activeCard.value?.id ?? merchantCardId,
      amount,
    })

    // 결과 폴링의 열쇠다. CPM 은 QR 상태 조회가 주지만 MPM 은 이 응답이 준다.
    paymentId.value = result.paymentId
    // **이 화면이 처음으로 진짜 값을 받는다.** 가맹점명은 백엔드가 QR 토큰으로 조회한 것이다.
    confirmInfo.value = { storeName: result.storeName, amount: result.amount }
    phase.value = 'confirm'
  } catch (error) {
    handleScanError(error)
  }
}

/**
 * 카메라를 다시 켠다.
 *
 * `useQrScanner` 는 QR 을 하나 읽으면 스스로 멈춘다(같은 QR 로 결제가 두 번 나가면 안 된다).
 * 그래서 입력 화면에서 스캐너로 되돌아올 때는 **직접 다시 켜야 한다.**
 */
async function rescan() {
  scannedToken.value = ''
  scanAmount.value = ''
  needsAmountInput.value = false
  await nextTick()
  if (videoRef.value) startScanner(videoRef.value, handleScanned)
}

function handleScanError(error) {
  if (error.code === 'QR_TOKEN_INVALID' || error.code === 'STORE_NOT_FOUND') {
    // 다른 QR 을 찍었다. 카메라를 다시 켜서 찍게 한다.
    rescan()
    scanMessage.value = '피그 가맹점 QR 이 아니에요. 다시 찍어 주세요.'
    return
  }
  if (error.code === 'PIN_AUTH_ID_INVALID') {
    openPin('scan')
    pinMessage.value = '인증 시간이 지났어요. 비밀번호를 다시 입력해 주세요.'
    return
  }
  showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
}

/**
 * QR 세션을 만들고 QR 화면으로 넘어간다.
 *
 * 결제 탭(PIN 입력 직후)과 가맹점 진입(이미 PIN 을 냈다) 두 경로가 여기로 모인다.
 * 가맹점 경로는 카드 목록이 아직 안 왔을 수 있어서 `activeCard` 대신 인자로 받는다.
 */
async function startQrSession(userCardId) {
  try {
    const session = await paymentStore.createQr(userCardId)
    qrToken.value = session.qrToken
    // 새 결제다. 지난 결제의 확인 내용이 남아 있으면 정보확인 화면을 건너뛴다.
    confirmInfo.value = null
    paymentResult.value = null
    // 만료 시간은 백엔드가 정한다. 화면에 180 을 박아두면 정책이 바뀔 때 어긋난다.
    secondsLeft.value = session.expiresIn
    phase.value = 'qr'
  } catch (error) {
    handleQrError(error)
  }
}

function handlePinError(error) {
  if (error.code === 'PIN_MISMATCH') {
    // 세션이 끊긴 게 아니다. 로그인 상태를 유지한 채 이 화면에서 다시 받는다 (#79).
    const remaining = error.data?.remainingAttempts
    pinMessage.value =
      remaining > 0 ? `${error.message} (${remaining}번 남음)` : '비밀번호를 5번 틀렸어요.'
    pin.value = []
    shakePinDots()
    return
  }
  if (error.code === 'INVALID_INPUT_VALUE') {
    pinMessage.value = error.reasonFor('paymentPin') ?? error.message
    pin.value = []
    shakePinDots()
    return
  }
  showToast('일시적인 오류가 발생했어요')
  pin.value = []
}

function handleQrError(error) {
  // 인증이 만료됐거나 이미 쓴 표다. QR 을 못 만들었으니 PIN 부터 다시 받는다.
  if (error.code === 'PIN_AUTH_ID_INVALID') {
    pinMessage.value = '인증 시간이 지났어요. 비밀번호를 다시 입력해 주세요.'
    pin.value = []
    phase.value = 'pin'
    return
  }
  showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  phase.value = 'cards'
}

function closeFlow() {
  clearFlowTimers()
  phase.value = 'cards'
  pin.value = []
  pinMessage.value = ''
}

function clearFlowTimers() {
  window.clearInterval(countdownTimer)
  window.clearTimeout(phaseTimer)
  window.clearInterval(pollTimer)
  window.clearInterval(resultTimer)
}

const pad = (number) => String(number).padStart(2, '0')

function format(date) {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatNow() {
  return format(new Date())
}

/** 서버가 준 `paidAt`(LocalDateTime 문자열)을 영수증 표기로 옮긴다. */
function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? formatNow() : format(date)
}

/**
 * 가맹점이 QR 을 스캔했는지 서버에 물어본다.
 *
 * 백엔드가 PENDING 3초 뒤 SCANNED 로 바꿔주므로(가맹점 단말이 없어 시연용),
 * 1초 간격이면 스캔 직후에 잡힌다.
 */
async function pollQrStatus() {
  try {
    const { status, paymentId: sessionPaymentId } = await paymentApi.getQrStatus(qrToken.value)

    // 결과 조회에 필요하다. 예전에는 이 값을 구조분해에서 버렸다.
    if (sessionPaymentId) paymentId.value = sessionPaymentId

    // 스캔되면 결과 폴링으로 넘긴다. 그 뒤는 getPaymentResult 가 굴린다 (phase watcher 참고).
    if (status === QR_STATUS.SCANNED || status === QR_STATUS.PROCESSING) {
      phase.value = 'processing'
      return
    }
    if (status === QR_STATUS.COMPLETED) {
      phase.value = 'processing'
      return
    }
    if (status === QR_STATUS.EXPIRED || status === QR_STATUS.FAILED) {
      showToast('결제가 진행되지 않았어요. 다시 시도해 주세요')
      phase.value = 'cards'
    }
  } catch (error) {
    if (error.code === 'QR_EXPIRED' || error.code === 'QR_NOT_FOUND') {
      showToast('QR 이 만료됐어요. 다시 결제해 주세요')
      phase.value = 'cards'
      return
    }
    // 그 밖의 오류는 일시적일 수 있다. 폴링을 세우지 않고 다음 차례에 다시 물어본다.
  }
}

/**
 * 결제 결과를 물어본다.
 *
 * ⚠️ **이 호출이 결제를 진행시킨다.** 백엔드가 부를 때마다 상태를 전진시키고,
 * COMPLETED 가 될 때 결제 내역을 기록한다 (`paymentApi.getPaymentResult` 주석).
 * 부르지 않으면 결제가 끝나지 않고 DB 에도 남지 않는다.
 */
async function pollPaymentResult() {
  if (!paymentId.value) return

  try {
    const result = await paymentApi.getPaymentResult(paymentId.value)

    if (result.status === QR_STATUS.COMPLETED) {
      paymentResult.value = result
      // 서버가 준 시각을 쓴다. 없으면 그때만 화면 시계로 떨어진다.
      paidAt.value = result.paidAt ? formatDateTime(result.paidAt) : formatNow()

      // 백엔드가 결제 완료 시점에 인증표를 used 로 찍는다 (backend#185).
      // 들고 있으면 다음 결제에서 재사용하려다 PIN_AUTH_ID_INVALID 가 난다.
      paymentStore.clearPinAuth()

      // 방금 결제로 카드 잔액·실적이 달라졌다. 다음 화면이 옛 값을 보지 않게 새로 받는다.
      cardStore.fetchCards().catch(() => {})

      finishProcessing(() => {
        phase.value = 'done'
      })
      return
    }

    if (result.status === QR_STATUS.FAILED) {
      // 실패한 QR 세션은 죽었다. 뒤에 결제 비밀번호 화면을 깔아두고 팝업을 띄운다.
      // 팝업을 닫으면 바로 PIN 부터 다시 받을 수 있다 — 실패한 자리에 남겨두지 않는다.
      //
      // 인증표도 함께 버린다. 백엔드는 실패에서 표를 소모하지 않지만(backend#185 는 완료
      // 시점에만 찍는다), **실패하면 PIN 부터 다시 받는다는 것이 이 화면의 정책**이다.
      // 들고 있으면 `QR Scan` 탭이 표가 살아 있다고 보고 PIN 을 건너뛰어 정책이 깨진다.
      paymentStore.clearPinAuth()
      finishProcessing(() => {
        // **팝업만 먼저 띄운다.** PIN 시트는 팝업을 닫은 뒤에 연다 (`closePaymentFailure`).
        // 예전에는 여기서 함께 열어 뒤에 깔아뒀는데, 팝업 너머로 키패드가 비쳐서
        // 실패를 알리기도 전에 비밀번호를 묻는 것처럼 보였다.
        //
        // 뒤에는 카드 선택 화면을 둔다. 'processing' 그대로 두면 "결제 중입니다" 가
        // 실패 팝업 뒤에 남아 서로 어긋난다.
        phase.value = 'cards'
        isPaymentFailed.value = true
      })
      return
    }

    // PROCESSING 이면 아직이다. 다음 차례에 다시 물어본다.
    //
    // **여기서 정보확인 화면으로 보내지 않는다** (#130). CPM 은 가맹점 단말이 금액을
    // 이미 갖고 있어서 확인 단계가 없다. 게다가 백엔드가 PROCESSING 응답에
    // `storeName` · `amount` 를 안 실어줘서 두 칸이 `-` 로 뜨던 화면이었다.
    // 확인 화면은 매장 QR 스캔(MPM)이 붙을 때 그쪽에서만 쓴다 — 그 응답은 두 값을 준다.
  } catch (error) {
    if (error.code === 'PAYMENT_NOT_FOUND') {
      showToast('결제 정보를 찾을 수 없어요. 다시 시도해 주세요')
      phase.value = 'cards'
      return
    }
    // 일시적인 오류일 수 있다. 폴링을 세우지 않는다.
  }
}

/**
 * 결제 중 화면을 최소 시간만큼 띄운 뒤 다음으로 넘긴다 (#130).
 *
 * 백엔드는 PROCESSING 을 2초 붙잡는다(`MOCK_PROCESS_DELAY_SECONDS`). 그래도 첫 폴링이
 * 이미 그 시간을 넘긴 세션을 만나면 COMPLETED 가 즉시 와서 화면이 깜빡이고 만다.
 * 결과가 언제 오든 사용자는 "결제 중" 을 이 시간만큼은 본다.
 *
 * 결과가 나왔으니 폴링은 여기서 세운다. 안 세우면 대기하는 동안 한 번 더 물어본다.
 */
function finishProcessing(next) {
  window.clearInterval(resultTimer)

  const elapsed = Date.now() - processingStartedAt
  phaseTimer = window.setTimeout(next, Math.max(0, PROCESSING_MIN_MS - elapsed))
}

watch(phase, async (nextPhase, previousPhase) => {
  clearFlowTimers()

  // 스캔 화면을 떠나면 무조건 카메라를 끈다. 켜둔 채 나가면 캠 불이 남는다.
  if (previousPhase === 'scan' && nextPhase !== 'scan') stopScanner()

  if (nextPhase === 'scan') {
    // `<video>` 가 DOM 에 붙은 뒤에 잡아야 한다.
    await nextTick()
    if (videoRef.value) startScanner(videoRef.value, handleScanned)
  }

  if (nextPhase === 'qr') {
    countdownTimer = window.setInterval(() => {
      if (secondsLeft.value > 0) secondsLeft.value -= 1
    }, 1000)

    pollTimer = window.setInterval(pollQrStatus, QR_POLL_INTERVAL_MS)
  }

  if (nextPhase === 'processing') {
    // 최소 노출 시간의 기준점. 결과가 언제 오든 여기서부터 잰다 (#130).
    processingStartedAt = Date.now()

    // 결과 조회가 상태를 전진시킨다. 백엔드가 PROCESSING 을 2초 붙잡아 두므로
    // QR 폴링과 같은 1초 간격이면 두세 번 안에 결론이 난다 (#122).
    pollPaymentResult()
    resultTimer = window.setInterval(pollPaymentResult, QR_POLL_INTERVAL_MS)
  }
})

function qrBack() {
  clearFlowTimers()
  if (startPhase === 'qr') {
    // 가맹점(피그의 PICK)에서 진입한 결제 → 피그의 PICK 화면으로 돌아갑니다.
    backToMerchant()
    return
  }
  // 결제 탭에서 진입한 결제 → 카드 선택(결제) 화면으로 돌아갑니다.
  phase.value = 'cards'
}

onMounted(() => {
  cardStore.ensureCardsWithImages()

  // 가맹점에서 카드를 고르고 비밀번호까지 입력한 경우 — PIN 은 이미 냈으니 QR 부터 만든다.
  // 카드 목록을 기다리지 않는다. 가맹점이 넘겨준 cardId 가 곧 userCardId 다.
  if (startPhase === 'qr') {
    if (!merchantCardId) {
      // PIN 인증 없이 주소창으로 바로 들어온 경우. 카드 선택부터 다시 받는다.
      phase.value = 'cards'
      return
    }
    startQrSession(merchantCardId)
  }
})

onBeforeUnmount(() => {
  clearFlowTimers()
  // 화면을 벗어나도 카메라는 살아 있다. 여기서 끄지 않으면 캠 불이 계속 켜져 있다.
  stopScanner()
})
</script>

<template>
  <section class="payment-screen">
    <template v-if="phase === 'cards' || phase === 'pin'">
      <header class="payment-header">
        <h1>결제</h1>
        <button class="icon-button" type="button" aria-label="메뉴 열기" @click="openMyPage()">
          <Menu :size="23" />
        </button>
      </header>

      <div class="payment-content">
        <div
          class="payment-card-stack"
          aria-label="결제 카드 선택"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="resetPointer"
        >
          <article
            v-for="(card, index) in cards"
            :key="card.id"
            class="payment-card"
            :class="`slot-${cardSlot(index)}`"
            :aria-hidden="cardSlot(index) > 2"
          >
            <div class="payment-card-photo">
              <img
                v-if="card.cardImageUrl"
                :src="card.cardImageUrl"
                alt=""
                draggable="false"
                :style="cardImageStyle(card.cardImageUrl, PAYMENT_CARD_RATIO)"
                @load="markCardImageOrientation"
              />
            </div>
          </article>
        </div>

        <div class="payment-card-meta" aria-live="polite">
          <span>{{ activeCard?.issuer }} {{ activeCard?.name }}</span>
          <div class="payment-card-dots" aria-label="카드 선택">
            <button
              v-for="(card, index) in cards"
              :key="`${card.id}-dot`"
              type="button"
              :class="{ active: index === activeIndex }"
              :aria-label="`${card.name} 선택`"
              @click="selectCard(index)"
            ></button>
          </div>
        </div>
      </div>

      <div class="payment-qr-area">
        <button class="payment-qr-button" type="button" @click="openPin">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect
              x="1"
              y="1"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <rect x="3.5" y="3.5" width="3" height="3" fill="currentColor" />
            <rect
              x="13"
              y="1"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <rect x="15.5" y="3.5" width="3" height="3" fill="currentColor" />
            <rect
              x="1"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <rect x="3.5" y="15.5" width="3" height="3" fill="currentColor" />
            <rect x="13" y="13" width="3" height="3" fill="currentColor" />
            <rect x="19" y="13" width="3" height="3" fill="currentColor" />
            <rect x="13" y="19" width="3" height="3" fill="currentColor" />
            <rect x="19" y="19" width="3" height="3" fill="currentColor" />
            <rect x="16" y="16" width="3" height="3" fill="currentColor" />
          </svg>
          QR 결제하기
        </button>
      </div>

      <nav class="bottom-nav">
        <button type="button" @click="goHome()">
          <img :src="iconHome" alt="" width="22" height="22" />
          <span>홈</span>
        </button>
        <button class="active" type="button">
          <img :src="iconPaymentActive" alt="" width="22" height="22" />
          <span>결제</span>
        </button>
        <button type="button" @click="goToMyCard()">
          <img :src="iconMycard" alt="" width="22" height="22" />
          <span>카드 내역</span>
        </button>
        <button type="button" @click="openReport()">
          <img :src="iconReport" alt="" width="22" height="22" />
          <span>리포트</span>
        </button>
      </nav>

      <div v-if="phase === 'pin'" class="payment-flow-layer">
        <button
          class="payment-pin-scrim"
          type="button"
          aria-label="결제 취소"
          @click="closeFlow"
        ></button>
        <button class="payment-flow-close" type="button" aria-label="닫기" @click="closeFlow">
          ×
        </button>

        <section class="payment-pin-sheet" @click.stop>
          <span class="payment-sheet-handle"></span>
          <div class="payment-pin-title">
            <h2>결제 비밀번호 6자리를 입력해 주세요</h2>
            <p>보안을 위해 비밀번호를 노출하지 마세요</p>
          </div>
          <div
            class="payment-pin-dots"
            :class="{ shake: shakePin }"
            aria-label="비밀번호 입력 상태"
          >
            <span v-for="index in 6" :key="index" :class="{ filled: index <= pin.length }"></span>
          </div>

          <!-- 검증 실패는 토스트로 띄우지 않는다. 시트가 화면을 덮고 있어 가려지고,
               어느 입력이 문제인지도 알려주지 못한다. -->
          <p v-if="pinMessage" class="px-6 text-center text-[13px] text-danger" role="alert">
            {{ pinMessage }}
          </p>

          <div class="payment-pin-pad">
            <button v-for="digit in 9" :key="digit" type="button" @click="addDigit(digit)">
              {{ digit }}
            </button>
            <button type="button" aria-label="한 글자 지우기" @click="deleteDigit">
              <svg width="27" height="21" viewBox="0 0 28 22" fill="none" aria-hidden="true">
                <path
                  d="M10 1H26C26.55 1 27 1.45 27 2V20C27 20.55 26.55 21 26 21H10L1 11L10 1Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M17 7L13 11M13 11L17 15M13 11H21"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button type="button" @click="addDigit(0)">0</button>
            <!--
              `완료` 버튼을 뺐다 (#130). 6자리를 채우면 자동으로 검증이 나간다.
              칸은 남긴다 — 3×4 격자라 없애면 `0` 이 가운데에서 밀린다.
            -->
            <span class="payment-pin-confirm grid place-items-center" aria-live="polite">
              {{ isSubmittingPin ? '확인 중' : '' }}
            </span>
          </div>
        </section>
      </div>
    </template>

    <section v-else-if="phase === 'qr'" class="payment-qr-screen">
      <header>
        <button type="button" aria-label="이전으로 돌아가기" @click="qrBack">
          <svg width="19" height="19" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 4L6 9L11 14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </header>

      <div class="payment-qr-status">
        <strong>결제 중입니다</strong>
        <span>{{ countdownText }}</span>
      </div>

      <div class="payment-qr-view">
        <div class="payment-qr-frame">
          <svg class="payment-qr-code" viewBox="0 0 192 192" aria-label="결제 QR 코드">
            <rect width="192" height="192" rx="10" fill="#fff" />
            <g fill="#1a1a1a">
              <path
                fill-rule="evenodd"
                d="M8 8h54v54H8V8zm8 8v38h38V16H16zm9 9h20v20H25V25zM130 8h54v54h-54V8zm8 8v38h38V16h-38zm9 9h20v20h-20V25zM8 130h54v54H8v-54zm8 8v38h38v-38H16zm9 9h20v20H25v-20z"
              />
              <path
                d="M76 8h10v10H76zm14 0h10v10H90zm14 0h10v10h-10zM76 22h10v10H76zm28 0h10v10h-10zM76 36h10v10H76zm14 0h10v10H90zM8 76h10v10H8zm14 0h10v10H22zm28 0h10v10H50zM8 90h10v10H8zm28 0h10v10H36zM8 104h10v10H8zm42 0h10v10H50zM76 76h10v10H76zm14 0h10v10H90zm14 0h10v10h-10zm14 0h10v10h-10zm14 0h10v10h-10zm14 0h10v10h-10zm14 0h10v10h-10zM104 90h10v10h-10zm28 0h10v10h-10zm-14 14h10v10h-10zm28 0h10v10h-10zm-14 28h10v10h-10zm14 0h10v10h-10zm14 0h10v10h-10zm-28 14h10v10h-10zm28 0h10v10h-10zm-28 14h10v10h-10zm28 0h10v10h-10zm14 0h10v10h-10z"
              />
            </g>
            <rect x="82" y="82" width="28" height="28" rx="4" fill="#ffcc00" />
            <rect x="88" y="88" width="16" height="16" rx="2" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      <!--
        두 결제 방식을 자유롭게 오간다. 백엔드가 인증표를 결제 완료 시점에 소모하게 바뀌어
        (backend#185) 갈아탈 때마다 PIN 을 다시 받지 않아도 된다.
      -->
      <div class="payment-qr-tabs" role="tablist" aria-label="QR 결제 방식">
        <button type="button" @click="startScanFlow">QR Scan</button>
        <button type="button" class="active">QR Code</button>
      </div>
      <p class="payment-qr-guide">매장에서 QR 코드를 스캔해 주세요</p>
    </section>

    <!-- 매장 QR 스캔 (MPM). 카메라로 실제 QR 을 읽는다 (#130). -->
    <section v-else-if="phase === 'scan'" class="payment-qr-screen">
      <header>
        <button type="button" aria-label="이전으로 돌아가기" @click="cancelScan">
          <svg width="19" height="19" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 4L6 9L11 14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </header>

      <div class="payment-qr-status">
        <strong>결제 요청 중...</strong>
      </div>

      <div class="payment-qr-view">
        <div class="payment-qr-frame">
          <!-- 카메라 미리보기. 프레임을 꽉 채우고 스캐너 장식을 그 위에 얹는다. -->
          <video
            v-show="!scannedToken"
            ref="videoRef"
            class="h-full w-full rounded-[18px] object-cover"
            muted
            playsinline
          ></video>

          <div v-if="!scannedToken" class="payment-scanner">
            <i class="corner top-left"></i>
            <i class="corner top-right"></i>
            <i class="corner bottom-left"></i>
            <i class="corner bottom-right"></i>
            <span class="payment-scan-line"></span>
          </div>

          <!--
            금액이 빠진 옛 평문 QR 을 읽었다. 그때만 금액을 받는다 (#134).
            지금 매장 QR 은 금액을 싣고 오므로 이 칸을 거치지 않고 곧장 확인 화면으로 간다.
          -->
          <div
            v-else-if="needsAmountInput"
            class="flex h-full w-full flex-col justify-center gap-3 px-5"
          >
            <p class="text-center text-xs text-sub">QR 을 읽었어요</p>
            <div class="flex items-baseline justify-between">
              <label class="text-[13px] font-semibold text-ink" for="scan-amount">결제 금액</label>
              <button
                type="button"
                class="bg-transparent text-xs text-sub underline"
                @click="rescan"
              >
                다시 찍기
              </button>
            </div>
            <input
              id="scan-amount"
              v-model="scanAmount"
              class="w-full rounded-xl border border-line bg-white px-3 py-2 text-right text-lg text-ink"
              type="number"
              inputmode="numeric"
              min="1"
              placeholder="0"
              @keyup.enter="submitScan()"
            />
          </div>

          <!-- 금액까지 실린 QR 이다. 물어볼 것이 없어 그대로 결제 정보를 확인하러 간다. -->
          <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 px-5">
            <p class="text-[13px] font-semibold text-ink">QR 을 읽었어요</p>
            <p class="text-xs text-sub">결제 정보를 확인하고 있어요</p>
          </div>
        </div>
      </div>

      <p v-if="scannerError" class="px-6 text-center text-[13px] text-danger" role="alert">
        {{ scannerError }}
      </p>
      <p v-else-if="scanMessage" class="px-6 text-center text-[13px] text-danger" role="alert">
        {{ scanMessage }}
      </p>

      <!--
        QR 화면과 같은 탭을 둔다. 예전에는 이쪽에 탭이 없어서 뒤로가기로 카드 선택까지
        나갔다가 다시 들어와야 했다.

        **QR 을 이미 읽은 뒤에는 감춘다.** 그때는 결제 요청이 이미 나가 있어서, 갈아타면
        진행 중인 결제를 두고 나가는 꼴이 된다.
      -->
      <div v-if="!scannedToken" class="payment-qr-tabs" role="tablist" aria-label="QR 결제 방식">
        <button type="button" class="active">QR Scan</button>
        <button type="button" @click="startQrCodeFlow">QR Code</button>
      </div>

      <p v-if="!scannedToken" class="payment-qr-guide">매장 QR 코드를 화면 안에 맞춰 주세요</p>
      <!-- 금액을 물어본 경우에만 확인 버튼이 필요하다. 금액이 실린 QR 은 이미 요청이 나갔다. -->
      <div v-else-if="needsAmountInput" class="px-6 pb-6">
        <button
          class="primary-button w-full"
          type="button"
          :disabled="paymentStore.isScanningStoreQr"
          @click="submitScan()"
        >
          {{ paymentStore.isScanningStoreQr ? '확인 중' : '결제 정보 확인하기' }}
        </button>
      </div>
    </section>

    <section v-else-if="phase === 'processing'" class="payment-processing-screen">
      <img :src="waitingPig" alt="" />
      <h2>결제 중입니다</h2>
      <p>잠시만 기다려주세요</p>
    </section>

    <!--
      결제 정보확인. **매장 QR 을 스캔(MPM)했을 때만 거치는 단계다** (#130).
      내 QR 을 보여주는 결제(CPM)는 여기로 오지 않는다 — confirmInfo 주석 참고.

      `POST /payment/qr/scan` 이 붙기 전까지는 아무도 이 화면에 들어오지 않는다.
      마크업을 지우지 않는 이유는 그 연동이 바로 다음 순서이고,
      그때 이 화면이 처음으로 진짜 가맹점명과 금액을 받기 때문이다.
    -->
    <section v-else-if="phase === 'confirm'" class="payment-done-screen">
      <div class="payment-done-scroll">
        <img :src="pickPig" alt="" />
        <h2>결제 정보를 확인하세요</h2>

        <dl class="payment-receipt">
          <div>
            <dt>가맹점명</dt>
            <!-- 아직 안 오는 값이다. 빈칸으로 두면 깨진 화면처럼 보여 금액과 같은 표시로 맞춘다. -->
            <dd>{{ confirmInfo?.storeName ?? '-' }}</dd>
          </div>
          <div>
            <dt>결제 금액</dt>
            <dd>{{ won(confirmInfo?.amount) }}</dd>
          </div>
        </dl>
      </div>

      <div class="payment-done-actions">
        <button class="benefit-button" type="button" @click="confirmPayment()">
          결제 하러가기
        </button>
        <button class="home-button" type="button" @click="goHome()">홈으로</button>
      </div>
    </section>

    <section v-else class="payment-done-screen">
      <div class="payment-done-scroll">
        <img :src="completePig" alt="" />
        <h2>결제가 완료되었습니다</h2>

        <dl class="payment-receipt">
          <!--
            영수증에 지어낸 값을 적지 않는다 (#122). 매장·금액은 스캔한 값을 앞세운다 —
            결과 응답의 그 두 칸이 목값으로 덮여 오기 때문이다 (#136, receiptStoreName 주석).
          -->
          <div>
            <dt>가맹점명</dt>
            <dd>{{ receiptStoreName }}</dd>
          </div>
          <div>
            <dt>결제 수단</dt>
            <dd>
              {{ paymentResult?.paymentMethod ?? `${activeCard?.issuer} ${activeCard?.name} 카드` }}
            </dd>
          </div>
          <div>
            <dt>결제 일시</dt>
            <dd>{{ paidAt }}</dd>
          </div>
          <div>
            <dt>결제 금액</dt>
            <dd>{{ won(receiptAmount) }}</dd>
          </div>
          <!-- 혜택이 없는 결제도 있다. 0원을 "받은 혜택" 으로 적기보다 줄을 빼는 편이 정확하다. -->
          <div v-if="receivedBenefit > 0">
            <dt>받은 혜택</dt>
            <dd class="benefit">{{ won(receivedBenefit) }}</dd>
          </div>
        </dl>
      </div>

      <div class="payment-done-actions">
        <button class="benefit-button" type="button" @click="openReport()">혜택 보러가기</button>
        <button class="home-button" type="button" @click="goHome()">홈으로</button>
      </div>
    </section>

    <!--
      결제 실패 팝업 (#123).
      딤을 눌러 닫히지 않게 한다 — 결제 결과는 사용자가 버튼으로 확인하고 넘어가야 한다.
    -->
    <!-- title 을 쓰지 않는다. 디자인에 상단 제목이 없고, "결제가 실패했어요" 와 겹친다. -->
    <BaseModal :is-open="isPaymentFailed" :can-close-on-backdrop="false" aria-label="결제 실패">
      <div class="flex flex-col items-center gap-2 py-2 text-center">
        <img :src="cryPig" alt="" width="141" height="147" />
        <p class="text-[17px] font-bold text-ink">결제가 실패했어요</p>
        <p class="text-[13px] text-sub">결제 비밀번호부터 다시 진행해 주세요</p>
      </div>

      <template #footer>
        <button class="primary-button" type="button" @click="closePaymentFailure()">
          뒤로 가기
        </button>
      </template>
    </BaseModal>
  </section>
</template>
