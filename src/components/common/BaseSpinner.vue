<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  /** 스크린리더용 설명. 화면에는 보이지 않는다. */
  label: { type: String, default: '불러오는 중' },
})

// 크기를 클래스 덮어쓰기로 받지 않고 prop 으로 받는다.
// 부모가 넘긴 h-4 와 컴포넌트의 h-6 은 특이도가 같아서, 어느 쪽이 이기는지는
// 속성 순서가 아니라 생성된 CSS 의 순서로 정해진다. 덮어쓰기는 믿을 게 못 된다.
const SIZE_CLASS = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
}
</script>

<template>
  <span role="status" class="inline-flex items-center" :class="SIZE_CLASS[size]">
    <!-- currentColor 를 쓰므로 부모의 text-* 색을 그대로 따라간다.
         버튼 안에 넣어도 버튼 글자색과 어긋나지 않는다. -->
    <svg class="h-full w-full animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>
