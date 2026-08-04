<script setup>
import { computed } from 'vue'
import BaseSpinner from './BaseSpinner.vue'

const props = defineProps({
  /** primary: 주 행동 / secondary: 보조 행동 / ghost: 배경 없는 텍스트 버튼 */
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost'].includes(v),
  },
  /** 폼 안에서 쓸 때 submit 으로 바꾼다. 기본값이 submit 이면 의도치 않게 폼이 전송된다. */
  type: { type: String, default: 'button' },
  isLoading: { type: Boolean, default: false },
  isDisabled: { type: Boolean, default: false },
  /** 가로를 꽉 채운다. 모바일 화면의 하단 주 버튼이 대부분 이 모양이다. */
  isBlock: { type: Boolean, default: false },
})

defineEmits(['click'])

// Preflight(전역 리셋)를 빼놨으므로 배경·글자색을 클래스로 직접 지정해야 한다.
// Preflight 가 있을 때처럼 button 배경이 알아서 투명해지지 않는다.
const VARIANT_CLASS = {
  primary: 'bg-primary text-ink hover:bg-primary-dark',
  secondary: 'bg-white text-ink border border-line hover:bg-icon-bg',
  ghost: 'bg-transparent text-sub hover:text-ink',
}

// 로딩 중에도 눌리면 같은 요청이 두 번 나간다.
const isInactive = computed(() => props.isDisabled || props.isLoading)
</script>

<template>
  <button
    :type="type"
    :disabled="isInactive"
    :aria-busy="isLoading"
    class="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="[VARIANT_CLASS[variant], isBlock && 'w-full']"
    @click="$emit('click', $event)"
  >
    <BaseSpinner v-if="isLoading" size="sm" />
    <slot />
  </button>
</template>
