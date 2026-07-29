<script setup>
import { computed, ref } from 'vue'
import { Menu } from 'lucide-vue-next'
import iconHome from '../assets/icons/home.svg'
import iconPaymentActive from '../assets/icons/payment-selected.svg'
import iconMycard from '../assets/icons/mycard.svg'
import iconReport from '../assets/icons/report.svg'
import cardSheet from '../assets/cards/payment-card-sheet.png'

const emit = defineEmits(['home', 'mypage'])

const cards = [
  { id: 'deep-dream', issuer: '신한카드', name: 'Deep Dream', cropY: 208 },
  { id: 'toktok-o', issuer: 'KB국민카드', name: '톡톡O', cropY: 609 },
  { id: 'zero', issuer: '현대카드', name: 'ZERO Edition2', cropY: 1022 },
  { id: 'da', issuer: '신한카드', name: 'DA@카드의정석', cropY: 1443 },
]

const activeIndex = ref(0)
const pointerStartY = ref(null)
const pointerMoved = ref(false)
const locked = ref(false)

const activeCard = computed(() => cards[activeIndex.value])

function cardSlot(index) {
  return (index - activeIndex.value + cards.length) % cards.length
}

function advanceCard() {
  if (locked.value) return
  locked.value = true
  activeIndex.value = (activeIndex.value + 1) % cards.length
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
</script>

<template>
  <section class="payment-screen">
    <header class="payment-header">
      <h1>결제</h1>
      <button class="icon-button" type="button" aria-label="메뉴 열기" @click="emit('mypage')">
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
              :src="cardSheet"
              alt=""
              draggable="false"
              :style="{ top: `${-card.cropY * 0.983}px` }"
            />
          </div>
        </article>
      </div>

      <div class="payment-card-meta" aria-live="polite">
        <span>{{ activeCard.issuer }} {{ activeCard.name }}</span>
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
      <button class="payment-qr-button" type="button">
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
      <button type="button" @click="emit('home')">
        <img :src="iconHome" alt="" width="22" height="22" />
        <span>홈</span>
      </button>
      <button class="active" type="button">
        <img :src="iconPaymentActive" alt="" width="22" height="22" />
        <span>결제</span>
      </button>
      <button type="button">
        <img :src="iconMycard" alt="" width="22" height="22" />
        <span>내 카드</span>
      </button>
      <button type="button">
        <img :src="iconReport" alt="" width="22" height="22" />
        <span>리포트</span>
      </button>
    </nav>
  </section>
</template>
