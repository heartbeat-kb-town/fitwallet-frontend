<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp, TriangleAlert } from 'lucide-vue-next'
import iconPayment from '@/assets/icons/payment.svg'
import { benefitIcons } from '@/data'

/**
 * 통합 한도(공동 월 한도) 그룹 카드.
 *
 * 여러 혜택이 **월 한도 하나를 나눠 쓰는** 묶음을 한 덩어리로 보여준다.
 * 백엔드 `GET /card/{cardId}/benefit` 의 `sharedLimitGroups[]` 한 건이 카드 하나다.
 *
 * 왜 묶어서 보여주나: 따로 그리면 같은 한도가 여러 번 세어진다.
 * 마트 주중 5%(월 10,000원)와 마트 주말 7%(월 10,000원)를 두 줄로 적으면
 * 20,000원을 받을 수 있다고 읽히는데, 실제로는 둘이 합쳐 10,000원이다.
 *
 * `style.css` 가 동결이라 마크업은 전부 Tailwind 유틸리티와 `@theme` 토큰으로 짰다.
 * Preflight 를 빼둔 프로젝트라 `ul` · `p` · `button` 의 브라우저 기본값을 직접 지운다.
 */
const props = defineProps({
  /** `sharedLimitGroups[]` 한 건. 모양은 백엔드 `CardMonthlyBenefitSharedLimitGroupResponse`. */
  group: { type: Object, required: true },
})

/**
 * 진행바와 범례가 혜택마다 다른 색을 쓴다.
 *
 * **`@theme` 토큰만 쓴다.** 한 그룹에 혜택이 넷을 넘는 경우는 없어서 네 칸이면 충분하고,
 * 넘치면 앞에서부터 다시 돈다.
 */
const SEGMENT_COLORS = [
  'var(--color-primary)',
  'var(--color-primary-dark)',
  'var(--color-muted)',
  'var(--color-muted-soft)',
]

/** 한도 소진 여부는 그룹이 통째로 판정된다. 구성 혜택 하나라도 살아 있으면 `AVAILABLE` 이다. */
const isExhausted = computed(() => props.group.groupLimitStatus === 'LIMIT_EXHAUSTED')

const isOpen = ref(true)

const sharedLimit = computed(() => props.group.sharedMonthlyLimit ?? null)

/**
 * 값을 표시 단위로 적는다.
 *
 * 단위는 응답이 알려준다(`limitUnit`). 화면이 혜택 종류로 추측하지 않는다 —
 * 한 그룹 안에 할인(원)과 적립(P)이 섞일 수 있다.
 */
function unitValue(value, unit) {
  const amount = (Number(value) || 0).toLocaleString('ko-KR')
  if (unit === 'POINT') return `${amount}P`
  if (unit === 'COUNT') return `${amount}회`
  if (unit === 'PERCENT') return `${amount}%`
  return `${amount}원`
}

/**
 * 이름이 겹칠 때만 구분자를 붙인다.
 *
 * 마트 주중·마트 주말은 대상이 둘 다 "마트" 라 무엇이 무엇인지 구분되지 않는다.
 * 백엔드가 그 구분자를 `displayQualifier` 로 준다.
 *
 * ⚠️ **`displayQualifier` 는 겹치지 않을 때도 온다.** 실제 응답에서 GS25·스타벅스가 나란히
 * `"일반 할인"` 을 달고 오는데, 그대로 붙이면 "GS25 일반 할인" 이 된다.
 * 그래서 **같은 이름이 둘 이상일 때만** 붙인다.
 */
const duplicatedNames = computed(() => {
  const counts = new Map()
  for (const service of props.group.benefitServices ?? []) {
    for (const target of service.targets ?? []) {
      counts.set(target.targetName, (counts.get(target.targetName) ?? 0) + 1)
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
})

function targetLabel(name, qualifier) {
  return qualifier && duplicatedNames.value.has(name) ? `${name} ${qualifier}` : name
}

/**
 * 진행바 조각.
 *
 * `usageBreakdown` 은 **공동 한도를 누가 얼마나 깎았는지**를 대상 단위로 쪼갠 것이다.
 * 합계가 `sharedMonthlyLimit.usedValue` 와 맞도록 백엔드가 검증해서 준다.
 *
 * `unattributed` 는 혜택은 적용됐지만 대상(카테고리·브랜드)으로 귀속되지 않은 몫이다.
 * 이름이 없어 "기타" 로 적는다. 빼면 진행바 길이가 사용량과 어긋난다.
 */
const segments = computed(() => {
  const limit = Number(sharedLimit.value?.limitValue) || 0
  const unit = sharedLimit.value?.limitUnit

  return (props.group.usageBreakdown ?? []).map((usage, index) => {
    const used = Number(usage.usedValue) || 0
    return {
      key: `${usage.benefitServiceId}-${usage.targetId ?? 'etc'}`,
      name: usage.unattributed ? '기타' : targetLabel(usage.targetName, usage.displayQualifier),
      usedLabel: usage.usedLabel ?? unitValue(used, unit),
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      used,
      // 한도 0 인 그룹은 백엔드가 만들지 않지만, 0 나눗셈은 막아 둔다.
      width: limit > 0 ? Math.min(100, (used / limit) * 100) : 0,
    }
  })
})

/**
 * 범례는 **실제로 한도를 깎은 대상만** 적는다.
 *
 * `usageBreakdown` 에는 아직 안 쓴 대상도 0원으로 전부 들어 있다. 편의점 혜택 하나가
 * GS25·CU·세븐일레븐을 덮는 식이라 여섯 칸이 흔한데, 그대로 적으면 "0원" 만 늘어선다.
 * 아무것도 안 썼으면 범례가 통째로 빈다 — 그때는 오른쪽 잔여 금액이 할 말을 다 한다.
 */
const legend = computed(() => segments.value.filter((segment) => segment.used > 0))

/** 안내 문구에 이름을 몇 개까지 적을지. 넘으면 "외 N곳" 으로 줄인다. */
const NOTICE_NAME_LIMIT = 3

/**
 * 안내 문구에 들어갈 혜택 이름.
 *
 * "GS25, 스타벅스 혜택은 월 10,000원 통합한도를 함께 씁니다" 의 앞부분이다.
 * 귀속되지 않은 몫("기타")은 이름이 아니므로 뺀다.
 */
const noticeNames = computed(() => {
  const names = [
    ...new Set(
      (props.group.usageBreakdown ?? [])
        .filter((usage) => !usage.unattributed && usage.targetName)
        .map((usage) => targetLabel(usage.targetName, usage.displayQualifier)),
    ),
  ]
  if (names.length <= NOTICE_NAME_LIMIT) return names.join(', ')
  return `${names.slice(0, NOTICE_NAME_LIMIT).join(', ')} 외 ${names.length - NOTICE_NAME_LIMIT}곳`
})

/** 카드 제목. 그룹이 걸쳐 있는 DB 카테고리명을 잇는다 (`교통 · 영화`). */
const title = computed(() =>
  (props.group.categories ?? []).map((category) => category.categoryName).join(' · '),
)

/**
 * 구성 혜택 행.
 *
 * 행의 단위는 **혜택 서비스가 아니라 대상**이다. 한 서비스가 카테고리 둘을 덮을 수 있고,
 * 그때 사용자가 보는 것은 "이 카테고리에서 얼마 깎였나" 다.
 *
 * 색은 `usageBreakdown` 과 같은 키로 맞춘다. 범례와 행의 색이 어긋나면 진행바를 읽을 수 없다.
 */
const rows = computed(() => {
  const colorByKey = new Map(segments.value.map((segment) => [segment.key, segment.color]))
  const categoryNames = new Map(
    (props.group.categories ?? []).map((category) => [category.categoryId, category.categoryName]),
  )

  return (props.group.benefitServices ?? []).flatMap((service) =>
    (service.targets ?? []).map((target) => ({
      key: `${service.benefitServiceId}-${target.targetId}`,
      name: targetLabel(target.targetName, service.displayQualifier),
      imageUrl: target.targetImageUrl,
      // 업종 혜택은 대상이 곧 카테고리라 "카테고리" 로 적고, 브랜드는 그 브랜드가 속한 업종을 적는다.
      tag:
        target.scopeType === 'INDUSTRY'
          ? '카테고리'
          : (categoryNames.get(target.categoryId) ?? '브랜드'),
      // 정률이면 "10% 할인", 정률 표기가 없는 혜택은 건당 한도가 그 자리를 대신한다.
      value: service.valueLabel || service.perTransactionLimitLabel,
      transactionCount: target.transactionCount,
      totalPaymentAmount: Number(target.totalPaymentAmount) || 0,
      // 적립은 원이 아니라 포인트다. 종류로 가른다 — `valueUnit` 은 정률이면 PERCENT 라 못 쓴다.
      received: unitValue(
        target.receivedBenefitValue,
        service.benefitType === 'ACCUMULATE' ? 'POINT' : 'KRW',
      ),
      usedLabel: target.sharedLimitUsedLabel,
      color: colorByKey.get(`${service.benefitServiceId}-${target.targetId}`) ?? SEGMENT_COLORS[0],
    })),
  )
})

const remainingLabel = computed(() => {
  if (!sharedLimit.value) return ''
  if (isExhausted.value) return '한도 소진'
  return `잔여 ${unitValue(sharedLimit.value.remainingValue, sharedLimit.value.limitUnit)}`
})

function icon(row) {
  return (
    row.imageUrl ??
    Object.entries(benefitIcons).find(([key]) => row.name.includes(key))?.[1] ??
    iconPayment
  )
}

function won(value) {
  return `${value.toLocaleString('ko-KR')}원`
}
</script>

<template>
  <section class="rounded-2xl bg-white p-4">
    <header class="flex items-center gap-2">
      <h4 class="m-0 min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{{ title }}</h4>
      <span class="flex-none rounded-full bg-icon-bg px-2 py-1 text-[10px] font-bold text-sub">
        통합한도
      </span>
      <span
        v-if="isExhausted"
        class="flex-none rounded-full bg-chip px-2 py-1 text-[10px] font-bold text-sub"
      >
        소진
      </span>
    </header>

    <!--
      상단 숫자는 **잔여가 아니라 사용량**이다. 통합 한도는 "얼마나 같이 썼나" 가 요점이라
      개별 혜택 행(남은 한도 / 전체 한도)과 방향이 반대다.
    -->
    <template v-if="sharedLimit">
      <div class="mt-3 flex items-baseline justify-between text-[13px] text-sub">
        <span>이번 달 통합 사용</span>
        <span>
          <em class="text-[19px] font-extrabold text-primary-dark not-italic">
            {{ (Number(sharedLimit.usedValue) || 0).toLocaleString('ko-KR') }}
          </em>
          / {{ unitValue(sharedLimit.limitValue, sharedLimit.limitUnit) }}
        </span>
      </div>

      <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-muted-softer">
        <span
          v-for="segment in segments"
          :key="segment.key"
          class="h-full"
          :style="{ width: `${segment.width}%`, background: segment.color }"
        ></span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-sub">
        <span v-for="segment in legend" :key="segment.key" class="inline-flex items-center gap-1">
          <i class="inline-block h-2 w-2 rounded-sm" :style="{ background: segment.color }"></i>
          {{ segment.name }} {{ segment.usedLabel }}
        </span>
        <span class="ml-auto flex-none" :class="isExhausted ? 'text-muted' : 'text-ink'">
          {{ remainingLabel }}
        </span>
      </div>

      <!--
        한도를 함께 쓴다는 사실은 숫자만으로 드러나지 않는다.
        이 문구가 없으면 사용자는 그룹 카드를 그냥 "혜택 두 개" 로 읽는다.
      -->
      <p
        v-if="noticeNames"
        class="mt-3 mb-0 flex gap-2 rounded-xl bg-icon-bg px-3 py-2.5 text-[12px] leading-relaxed text-sub"
      >
        <TriangleAlert :size="13" class="mt-0.5 flex-none text-primary-dark" />
        <span>
          <b class="text-ink">{{ noticeNames }}</b> 혜택은
          <b class="text-ink"
            >월 {{ unitValue(sharedLimit.limitValue, sharedLimit.limitUnit) }} 통합한도</b
          >를 함께 씁니다. 한 곳에서 쓸수록 다른 혜택의 잔여 한도가 줄어듭니다.
        </span>
      </p>
    </template>

    <button
      type="button"
      class="mx-auto mt-2 flex items-center gap-1 bg-transparent py-2 text-[12px] text-sub"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      {{ isOpen ? '접기' : '펼치기' }}
      <component :is="isOpen ? ChevronUp : ChevronDown" :size="13" />
    </button>

    <ul v-if="isOpen" class="m-0 list-none p-0">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex items-center gap-3 border-t border-line py-3 pl-3"
        :style="{ boxShadow: `inset 3px 0 0 ${row.color}` }"
      >
        <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-icon-bg">
          <img :src="icon(row)" alt="" width="18" height="18" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5">
            <b class="truncate text-[15px] font-bold text-ink">{{ row.name }}</b>
            <em class="flex-none rounded bg-chip px-1.5 py-0.5 text-[10px] text-sub not-italic">
              {{ row.tag }}
            </em>
          </span>
          <span class="mt-0.5 block truncate text-[12px] text-sub">
            <template v-if="row.value">{{ row.value }} · </template>
            {{ row.transactionCount }}건 · {{ won(row.totalPaymentAmount) }} 결제
          </span>
        </span>
        <span class="flex-none text-right">
          <b class="block text-[15px] font-extrabold text-received">-{{ row.received }}</b>
          <span v-if="row.usedLabel" class="mt-0.5 block text-[11px] text-muted">
            한도 {{ row.usedLabel }} 차감
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>
