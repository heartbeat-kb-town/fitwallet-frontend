<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronDown, ChevronUp, GripVertical } from 'lucide-vue-next'
import cardSheet from '@/assets/cards/payment-card-sheet.png'
import { useCardStore } from '@/stores/cardStore'

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()

const cards = computed(() => cardStore.cards)
const draggingId = ref('')

onMounted(() => cardStore.ensureCards())

// 마이페이지가 넘겨준 `returnTo`(원래 온 주소)를 그대로 되돌려준다.
// 마이페이지 → 뒤로 → 원래 화면 순서가 유지돼야 기존 동작과 같다. (#52, #61)
function goBack() {
  router.push({ name: 'my-page', query: { returnTo: route.query.returnTo } })
}

function startDrag(cardId, event) {
  draggingId.value = cardId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', cardId)
}

function dropOn(targetId) {
  if (!draggingId.value || draggingId.value === targetId) return
  const next = [...cards.value]
  const from = next.findIndex((card) => card.id === draggingId.value)
  const to = next.findIndex((card) => card.id === targetId)
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  cardStore.reorder(next.map((card) => card.id))
  draggingId.value = ''
}

function moveCard(index, direction) {
  const target = index + direction
  if (target < 0 || target >= cards.value.length) return
  const next = [...cards.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  cardStore.reorder(next.map((card) => card.id))
}
</script>

<template>
  <section class="card-management-screen">
    <header class="card-management-header">
      <button type="button" aria-label="마이페이지로 돌아가기" @click="goBack()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <h1>내 카드 관리</h1>
      <span aria-hidden="true"></span>
    </header>

    <div class="card-management-content">
      <section class="card-management-guide">
        <strong>결제할 카드 순서를 정해보세요</strong>
        <p>
          주카드는 결제 탭에서 가장 먼저 표시돼요.<br />카드를 끌거나 화살표를 눌러 순서를 바꿀 수
          있어요.
        </p>
      </section>

      <div class="card-management-list">
        <article
          v-for="(card, index) in cards"
          :key="card.id"
          class="managed-card"
          :class="{ dragging: draggingId === card.id }"
          draggable="true"
          @dragstart="startDrag(card.id, $event)"
          @dragend="draggingId = ''"
          @dragover.prevent
          @drop.prevent="dropOn(card.id)"
        >
          <div class="managed-card-rank">{{ index + 1 }}</div>

          <div class="managed-card-thumb">
            <img
              :src="cardSheet"
              alt=""
              draggable="false"
              :style="{ top: `${-card.cropY * 0.173}px` }"
            />
          </div>

          <div class="managed-card-info">
            <span>{{ card.issuer }}</span>
            <strong>{{ card.name }}</strong>
            <button
              class="primary-card-button"
              :class="{ active: index === 0 }"
              type="button"
              @click="cardStore.setPrimary(card.id)"
            >
              <span class="primary-card-check">
                <Check v-if="index === 0" :size="12" :stroke-width="3" />
              </span>
              {{ index === 0 ? '주카드' : '주카드로 설정' }}
            </button>
          </div>

          <div class="managed-card-controls">
            <GripVertical class="managed-card-grip" :size="20" aria-hidden="true" />
            <div>
              <button
                type="button"
                :disabled="index === 0"
                :aria-label="`${card.name} 순서 올리기`"
                @click="moveCard(index, -1)"
              >
                <ChevronUp :size="17" />
              </button>
              <button
                type="button"
                :disabled="index === cards.length - 1"
                :aria-label="`${card.name} 순서 내리기`"
                @click="moveCard(index, 1)"
              >
                <ChevronDown :size="17" />
              </button>
            </div>
          </div>
        </article>
      </div>

      <p class="card-management-note">변경한 순서는 바로 저장돼요.</p>
      <button class="card-management-done" type="button" @click="goBack()">완료</button>
    </div>
  </section>
</template>
