<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import HeaderCategory from './HeaderCategory.vue'
import HeaderDefault from './HeaderDefault.vue'
import HeaderHome from './HeaderHome.vue'
import HeaderPlain from './HeaderPlain.vue'
import HeaderSearch from './HeaderSearch.vue'
import { HEADER_LAYOUT } from './headerLayout'
import { getCategory } from '@/constants/categories'

/**
 * 상단바 스위처. 화면마다 상단바를 직접 만들지 않고,
 * 라우트의 meta.header 로 종류만 지정하면 된다.
 *
 *   meta: { header: { type: 'default', title: '리포트' } }
 *   meta: { header: { type: 'home' } }
 *   meta: { header: { type: 'search' } }
 *   meta: { header: { type: 'category' } }               // 제목·아이콘은 :type 파라미터로 자동 결정 (constants/categories.js)
 *   meta: { header: { type: 'plain', title: '결제' } }   // 뒤로가기·구분선 없음, 왼쪽정렬 큰 제목
 *
 * type 을 생략하면 'default' 로 취급한다. 높이는 모든 타입 동일 (headerLayout.js 참고) —
 * category 처럼 줄이 더 필요한 타입도 이 높이 안에서 글씨 크기·간격으로 맞춘다.
 * 'home'·'plain' 타입은 하단 구분선을 그리지 않는다.
 */
const NO_BORDER_TYPES = ['home', 'plain']

const route = useRoute()
const header = computed(() => route.meta.header ?? {})
const category = computed(() => getCategory(route.params.type))
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-40 mx-auto max-w-[414px] bg-white px-4"
    :class="[
      HEADER_LAYOUT.height,
      NO_BORDER_TYPES.includes(header.type) ? '' : 'border-b border-gray-100',
    ]"
  >
    <HeaderHome v-if="header.type === 'home'" />
    <HeaderSearch v-else-if="header.type === 'search'" />
    <HeaderCategory
      v-else-if="header.type === 'category'"
      :title="category.title"
      :icon="category.icon"
    />
    <HeaderPlain v-else-if="header.type === 'plain'" :title="header.title" />
    <HeaderDefault v-else :title="header.title" />
  </header>
</template>
