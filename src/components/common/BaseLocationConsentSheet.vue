<script setup>
import iconLocation from '@/assets/icons/location.svg'
import { useLocationStore } from '@/stores/locationStore'
import { useToast } from '@/composables/useToast'

/**
 * 위치 정보 이용 동의 시트.
 *
 * 홈(카테고리) · 검색 · 가맹점 세 화면이 같이 쓴다. 예전에는 `HomeView` 안에만 있어서
 * 검색으로 들어온 사용자는 동의할 방법이 없었다 (#220).
 *
 * 저장은 이 컴포넌트가 맡는다. 화면마다 try-catch 를 다시 짜면 실패했을 때 시트를
 * 닫아 버리는 곳이 생긴다 — 닫으면 사용자가 다시 동의할 수 없다.
 */
const props = defineProps({
  /** `내 주변 {subject} 혜택을 볼까요?` 의 가운데. 카테고리명이나 검색어를 넣는다. */
  subject: { type: String, default: '' },
})

const emit = defineEmits(['agreed', 'close'])

const locationStore = useLocationStore()
const { showToast } = useToast()

async function agree() {
  if (locationStore.isSaving) return

  try {
    await locationStore.agree()
  } catch (error) {
    // 시트를 닫지 않는다. 닫으면 사용자가 다시 동의할 방법이 없다.
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    return
  }

  emit('agreed')
}
</script>

<!--
  `Transition` 은 여기 두지 않는다. 여닫기는 부모의 `v-if` 가 정하므로 전환도 부모가 감싼다 —
  안에 두면 컴포넌트와 함께 마운트돼 나타나는 순간을 잡지 못한다.
-->
<template>
  <div class="sheet-layer">
    <button class="scrim" aria-label="닫기" @click="emit('close')"></button>
    <section class="sheet consent-sheet">
      <span class="handle"></span>
      <span class="consent-icon">
        <img :src="iconLocation" alt="" width="32" height="32" />
      </span>
      <div class="consent-copy">
        <h2>내 주변 {{ props.subject ? `${props.subject} ` : '' }}혜택을 볼까요?</h2>
        <p>가까운 매장과 지금 받을 수 있는 카드 혜택을 찾기 위해 위치 정보가 필요해요.</p>
      </div>
      <button class="primary-button" :disabled="locationStore.isSaving" @click="agree()">
        {{ locationStore.isSaving ? '저장 중…' : '위치 정보 동의하고 보기' }}
      </button>
      <button class="text-button" :disabled="locationStore.isSaving" @click="emit('close')">
        다음에 할게요
      </button>
    </section>
  </div>
</template>
