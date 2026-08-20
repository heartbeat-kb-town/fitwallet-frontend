<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/**
 * 리포트의 월 선택기.
 *
 * 같은 모양이 네 군데에 붙는다 — 메인의 받은·놓친 혜택 카드, 그리고 두 상세 화면(#200).
 * 네 벌을 손으로 두면 한 군데만 고치는 일이 생긴다.
 *
 * **어느 달인지 이 컴포넌트가 정하지 않는다.** 화면이 커서를 들고 있고 여기는 표시와
 * 클릭만 맡는다 — 받은 혜택과 놓친 혜택이 각자의 달을 보기 때문에(#188) 상태를
 * 여기로 끌어올리면 둘이 다시 묶인다.
 */
defineProps({
  /** 적을 문구. `2026년 8월` 처럼 연도까지 적는다. */
  label: { type: String, required: true },

  /** 무엇의 달인지. 스크린리더가 두 선택기를 구분할 수 있어야 한다. */
  name: { type: String, required: true },

  /** 이번 달인가. 미래 달에는 결제가 있을 수 없어 다음 달 버튼을 잠근다. */
  isCurrentMonth: { type: Boolean, default: false },
})

defineEmits(['prev', 'next'])
</script>

<template>
  <!--
    Preflight 를 빼둔 프로젝트라 `bg-transparent` 를 직접 준다.
    안 주면 브라우저 기본 버튼 배경(회색 알약)이 화살표 뒤에 그대로 보인다.
  -->
  <div class="flex shrink-0 items-center gap-1 text-muted-deep">
    <button
      type="button"
      :aria-label="`${name} 이전 달`"
      class="flex bg-transparent p-0"
      @click="$emit('prev')"
    >
      <ChevronLeft :size="16" />
    </button>
    <strong class="text-[13px] font-bold text-sub">{{ label }}</strong>
    <button
      type="button"
      :aria-label="`${name} 다음 달`"
      :disabled="isCurrentMonth"
      class="flex bg-transparent p-0 disabled:opacity-30"
      @click="$emit('next')"
    >
      <ChevronRight :size="16" />
    </button>
  </div>
</template>
