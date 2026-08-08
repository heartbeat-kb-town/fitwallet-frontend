<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'

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
const qrTab = ref('scan')
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
 * 결제 정보확인 화면에 띄울 값. 가맹점이 QR 을 스캔한 뒤, 결제를 마치기 전에 보여준다.
 *
 * ⚠️ **백엔드가 아직 이 값을 주지 않는다.** `markSessionProcessing` 이 store_id 와 amount 를
 * DB 에는 쓰지만, PROCESSING 응답에는 `paymentId` 와 `status` 만 담아 보낸다
 * (`DefaultPaymentService:132`). `storeName` · `amount` 는 COMPLETED 응답에만 채워진다.
 *
 * 그래서 지금은 **두 칸이 `-` 로 뜬다.** 그래도 화면을 켜 두기로 했다 — 흐름을 미리 확인할 수
 * 있고, 백엔드가 빌더에 두 줄만 채워주면 프론트 수정 없이 값이 들어온다.
 * **금액을 화면에서 지어내지 않는다.** 확인 화면에 가짜 금액을 적으면 확인이 아니게 된다.
 */
const confirmInfo = ref(null)

let countdownTimer
let phaseTimer
let pollTimer
let resultTimer

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

function cardSlot(index) {
  return (index - activeIndex.value + cards.value.length) % cards.value.length
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

function openPin() {
  pin.value = []
  pinMessage.value = ''
  phase.value = 'pin'
}

/** 실패 팝업의 "뒤로 가기". 닫으면 뒤에 이미 깔려 있는 결제 비밀번호 화면이 드러난다. */
function closePaymentFailure() {
  isPaymentFailed.value = false
}

/** 정보확인 화면의 "결제 하러가기". 결과 폴링을 다시 돌려 결제를 마무리한다. */
function confirmPayment() {
  phase.value = 'processing'
}

function addDigit(digit) {
  if (pin.value.length < 6) pin.value.push(digit)
}

function deleteDigit() {
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
  if (paymentStore.isVerifyingPin || paymentStore.isCreatingQr) return

  const userCardId = activeCard.value.id
  pinMessage.value = ''
  try {
    await paymentStore.verifyPin({ userCardId, paymentPin: pin.value.join('') })
    await startQrSession(userCardId)
  } catch (error) {
    handlePinError(error)
  }
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
    qrTab.value = 'scan'
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
      phase.value = 'done'

      // 방금 결제로 카드 잔액·실적이 달라졌다. 다음 화면이 옛 값을 보지 않게 새로 받는다.
      cardStore.fetchCards().catch(() => {})
      return
    }

    // 가맹점이 스캔해서 금액이 확정됐고 아직 확인을 안 받았으면 정보확인 화면을 띄운다.
    // 둘 다 와야 한다 — 하나만 오면 나머지 칸이 비어 보인다.
    // 가맹점이 스캔해 결제가 시작됐다. 마치기 전에 정보확인을 한 번 거친다.
    // storeName 이 아직 안 오므로, 가맹점을 거쳐 들어온 결제면 그때 들고 온 이름이라도 쓴다.
    if (result.status === QR_STATUS.PROCESSING && !confirmInfo.value) {
      confirmInfo.value = {
        storeName: result.storeName ?? merchantName ?? null,
        amount: result.amount ?? null,
      }
      phase.value = 'confirm'
      return
    }

    if (result.status === QR_STATUS.FAILED) {
      // 실패한 QR 세션은 죽었다. 뒤에 결제 비밀번호 화면을 깔아두고 팝업을 띄운다.
      // 팝업을 닫으면 바로 PIN 부터 다시 받을 수 있다 — 실패한 자리에 남겨두지 않는다.
      openPin()
      isPaymentFailed.value = true
    }
    // PROCESSING 이면 아직이다. 다음 차례에 다시 물어본다.
  } catch (error) {
    if (error.code === 'PAYMENT_NOT_FOUND') {
      showToast('결제 정보를 찾을 수 없어요. 다시 시도해 주세요')
      phase.value = 'cards'
      return
    }
    // 일시적인 오류일 수 있다. 폴링을 세우지 않는다.
  }
}

watch(phase, (nextPhase) => {
  clearFlowTimers()

  if (nextPhase === 'qr') {
    countdownTimer = window.setInterval(() => {
      if (secondsLeft.value > 0) secondsLeft.value -= 1
    }, 1000)

    pollTimer = window.setInterval(pollQrStatus, QR_POLL_INTERVAL_MS)
  }

  if (nextPhase === 'processing') {
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

onBeforeUnmount(clearFlowTimers)
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
          <span>내 카드</span>
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
            <button
              class="payment-pin-confirm"
              type="button"
              :disabled="paymentStore.isVerifyingPin || paymentStore.isCreatingQr"
              @click="confirmPin"
            >
              {{ paymentStore.isVerifyingPin || paymentStore.isCreatingQr ? '확인 중' : '완료' }}
            </button>
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
          <div v-if="qrTab === 'scan'" class="payment-scanner">
            <i class="corner top-left"></i>
            <i class="corner top-right"></i>
            <i class="corner bottom-left"></i>
            <i class="corner bottom-right"></i>
            <span class="payment-scan-line"></span>
          </div>

          <svg v-else class="payment-qr-code" viewBox="0 0 192 192" aria-label="결제 QR 코드">
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

      <div class="payment-qr-tabs" role="tablist" aria-label="QR 결제 방식">
        <button type="button" :class="{ active: qrTab === 'scan' }" @click="qrTab = 'scan'">
          QR Scan
        </button>
        <button type="button" :class="{ active: qrTab === 'code' }" @click="qrTab = 'code'">
          QR Code
        </button>
      </div>
      <p class="payment-qr-guide">
        {{
          qrTab === 'scan'
            ? '매장 QR 코드를 화면 안에 맞춰 주세요'
            : '매장에서 QR 코드를 스캔해 주세요'
        }}
      </p>
    </section>

    <section v-else-if="phase === 'processing'" class="payment-processing-screen">
      <img :src="waitingPig" alt="" />
      <h2>결제 중입니다</h2>
      <p>잠시만 기다려주세요</p>
    </section>

    <!--
      결제 정보확인. 가맹점이 QR 을 스캔해 금액이 확정된 뒤, 결제를 마치기 전에 한 번 보여준다.
      백엔드가 storeName·amount 를 줄 때만 이 단계가 생긴다 (confirmInfo 주석 참고).
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
          <!-- 영수증은 전부 결제 결과 응답에서 온다. 지어낸 값을 적지 않는다 (#122). -->
          <div>
            <dt>가맹점명</dt>
            <dd>{{ paymentResult?.storeName ?? merchantName ?? '-' }}</dd>
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
            <dd>{{ won(paymentResult?.amount) }}</dd>
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
