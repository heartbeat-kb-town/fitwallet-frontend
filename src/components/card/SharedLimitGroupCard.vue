<script setup>
import { computed, ref } from 'vue'
import { LayoutGrid } from 'lucide-vue-next'
import { BRAND_LOGOS } from '@/constants/brandLogos'
import { benefitCategoryIcon, matchBenefitCategoryIcon } from '@/constants/benefitCategoryIcons'
import { benefitUnitValue } from '@/utils/benefitUnit'

/**
 * 통합 한도(공동 월 한도) 그룹 카드.
 *
 * 여러 혜택이 **월 한도 하나를 나눠 쓰는** 묶음을 한 덩어리로 보여준다.
 * 백엔드 `GET /card/{cardId}/benefit` 의 `sharedLimitGroups[]` 한 건이 카드 하나다.
 *
 * 왜 묶어서 보여주나: 따로 그리면 같은 한도가 여러 번 세어진다.
 * 편의점 10%(월 7,000원)와 커피 20%(월 7,000원)를 두 줄로 적으면 14,000원을 받을 수
 * 있다고 읽히는데, 실제로는 둘이 합쳐 7,000원이다.
 *
 * `style.css` 가 동결이라 마크업은 전부 Tailwind 유틸리티와 `@theme` 토큰으로 짰다.
 * Preflight 를 빼둔 프로젝트라 `h4` · `em` 의 브라우저 기본값을 직접 지운다.
 */
const props = defineProps({
  /** `sharedLimitGroups[]` 한 건. 모양은 백엔드 `CardMonthlyBenefitSharedLimitGroupResponse`. */
  group: { type: Object, required: true },
})

/**
 * 진행바·범례·행 왼쪽 띠의 색. **가맹점(대상) 하나에 색 하나다.**
 *
 * 처음엔 혜택 서비스 단위로 칠했는데, 한 혜택이 GS25·CU·세븐일레븐을 함께 덮다 보니
 * 진행바에서 어디가 어디인지 구분되지 않았다. 범례가 가맹점 단위라 색도 가맹점 단위여야 한다.
 *
 * **순서가 곧 색맹 안전장치다.** `@theme` 의 `--color-series-*` 를 앞에서부터 배정하고
 * 섞지 않는다 (`style.css` 주석 참고). 여섯을 넘으면 앞에서부터 다시 돈다 —
 * 한 그룹의 가맹점이 여섯을 넘는 경우는 아직 없다.
 */
const SERIES_COLORS = [
  'var(--color-series-1)',
  'var(--color-series-2)',
  'var(--color-series-3)',
  'var(--color-series-4)',
  'var(--color-series-5)',
  'var(--color-series-6)',
]

const sharedLimit = computed(() => props.group.sharedMonthlyLimit ?? null)

/** 한도 소진 여부는 그룹이 통째로 판정된다. 구성 혜택 하나라도 살아 있으면 `AVAILABLE` 이다. */
const isExhausted = computed(() => props.group.groupLimitStatus === 'LIMIT_EXHAUSTED')

/** 카드 제목. 그룹이 걸쳐 있는 DB 카테고리명을 잇는다 (`편의점/마트 · 쇼핑`). */
const title = computed(() =>
  (props.group.categories ?? []).map((category) => category.categoryName).join(' · '),
)

/**
 * 가맹점(대상)마다 색 하나.
 *
 * 키는 `혜택-대상` 쌍이다. 같은 브랜드가 서로 다른 혜택에 동시에 걸릴 수 있어서
 * 대상 ID 만으로는 겹친다. 배정 순서는 `benefitServices` → `targets` 순서 그대로다 —
 * 응답 순서가 곧 화면 순서라 진행바·범례·행이 같은 색으로 맞물린다.
 */
const colorByTarget = computed(() => {
  const colors = new Map()
  let index = 0
  for (const service of props.group.benefitServices ?? []) {
    for (const target of service.targets ?? []) {
      colors.set(
        `${service.benefitServiceId}-${target.targetId}`,
        SERIES_COLORS[index++ % SERIES_COLORS.length],
      )
    }
  }
  return colors
})

/**
 * 혜택 이름에서 앞의 구분자를 뗀 부분.
 *
 * `benefitName` 이 `"일반 할인 - 편의점"` 처럼 오고, 서비스 머리글에 적을 것은 뒤쪽("편의점")이다.
 * 앞쪽은 `displayQualifier` 로 따로 오는 값이라 여기 다시 적으면 겹친다.
 */
function serviceName(service) {
  const [, tail] = (service.benefitName ?? '').split(' - ')
  return tail?.trim() || service.benefitName
}

/**
 * 혜택이 혼자 쓰는 월 한도 한 줄. 공동 한도는 이미 카드 맨 위에 있으니 여기서 뺀다.
 *
 * 횟수 한도는 `"월 5회 중 1회 소진"` 으로 적는다 — 금액과 달리 "몇 번 남았나" 로 읽히는 값이라
 * 백엔드의 `limitLabel`(`"1회 / 5회"`)보다 이 문장이 오해가 없다.
 */
function serviceLimitLabel(service) {
  const limit = service.serviceMonthlyLimits?.[0]
  if (!limit) return null
  if (limit.limitUnit === 'COUNT') {
    return `월 ${benefitUnitValue(limit.limitValue, 'COUNT')} 중 ${benefitUnitValue(limit.usedValue, 'COUNT')} 소진`
  }
  return limit.limitLabel
}

/**
 * 진행바 조각과 범례.
 *
 * `usageBreakdown` 은 **공동 한도를 누가 얼마나 깎았는지**를 대상 단위로 쪼갠 것이다.
 * 합계가 `sharedMonthlyLimit.usedValue` 와 맞도록 백엔드가 검증해서 준다.
 *
 * 아직 안 쓴 대상도 `0원` 으로 전부 들어 있고, 디자인도 그대로 늘어놓는다
 * (`GS25 2,900원 · 세븐일레븐 0원 · 스타벅스 0원`). 무엇이 이 한도를 함께 쓰는지가
 * 이 줄의 요점이라 0원도 지우지 않는다.
 *
 * `unattributed` 는 혜택은 적용됐지만 대상으로 귀속되지 않은 몫이다. 이름이 없어 "기타" 로 적는다.
 */
const segments = computed(() => {
  const limit = Number(sharedLimit.value?.limitValue) || 0
  const unit = sharedLimit.value?.limitUnit

  return (props.group.usageBreakdown ?? []).map((usage, index) => {
    const used = Number(usage.usedValue) || 0
    return {
      key: `${usage.benefitServiceId}-${usage.targetId ?? 'etc'}`,
      name: usage.unattributed ? '기타' : usage.targetName,
      usedLabel: usage.usedLabel ?? benefitUnitValue(used, unit),
      color:
        colorByTarget.value.get(`${usage.benefitServiceId}-${usage.targetId}`) ??
        SERIES_COLORS[index % SERIES_COLORS.length],
      // 한도 0 인 그룹은 백엔드가 만들지 않지만, 0 나눗셈은 막아 둔다.
      width: limit > 0 ? Math.min(100, (used / limit) * 100) : 0,
    }
  })
})

/** 진행바에는 실제로 깎은 조각만 그린다. 폭 0 인 조각은 조각 사이 여백만 남긴다. */
const barSegments = computed(() => segments.value.filter((segment) => segment.width > 0))

/**
 * 혜택 서비스별로 묶은 대상 행.
 *
 * 디자인이 `편의점 [월 3회 중 2회 소진]` 아래에 GS25·세븐일레븐을 넣는 구조다.
 * 대상만 평평하게 늘어놓으면 어느 혜택의 횟수 한도인지가 사라진다.
 */
const services = computed(() =>
  (props.group.benefitServices ?? []).map((service) => ({
    key: service.benefitServiceId,
    name: serviceName(service),
    limitLabel: serviceLimitLabel(service),
    exhausted: service.serviceLimitStatus === 'LIMIT_EXHAUSTED',
    targets: (service.targets ?? []).map((target) => ({
      key: `${service.benefitServiceId}-${target.targetId}`,
      color: colorByTarget.value.get(`${service.benefitServiceId}-${target.targetId}`),
      name: target.targetName,
      imageUrl: logoUrl(target),
      categoryIconUrl: matchBenefitCategoryIcon(target.targetName),
      value: service.valueLabel,
      perTransactionLimit: service.perTransactionLimitLabel,
      transactionCount: target.transactionCount,
      totalPaymentAmount: Number(target.totalPaymentAmount) || 0,
      received: target.receivedBenefitLabel,
    })),
  })),
)

/**
 * 로드에 실패한 로고 주소.
 *
 * 브랜드 로고는 외부(브랜드 사이트)에서 받아오므로 주소가 죽거나 오프라인이면 깨진 그림이 남는다.
 * 실패한 것만 기억해 뒀다가 계열색 이니셜 타일로 되돌린다.
 */
const brokenLogos = ref(new Set())

function markLogoBroken(url) {
  brokenLogos.value = new Set(brokenLogos.value).add(url)
}

/**
 * 브랜드 로고 주소.
 *
 * **응답이 먼저다.** 백엔드가 `brand.brand_image_url` 을 채우면 그 값이 그대로 쓰이고,
 * 지금처럼 비어 있을 때만 `BRAND_LOGOS` 를 본다 (그 파일 주석 참고).
 */
function logoUrl(target) {
  const url = target.targetImageUrl ?? BRAND_LOGOS[target.targetName]
  return url && !brokenLogos.value.has(url) ? url : null
}

/**
 * 혜택 머리글의 그림.
 *
 * **대상이 딱 하나인 혜택이면 그 브랜드 로고를 쓴다** (`스타벅스 환급할인` · `GS25 환급할인`).
 * 아래 대상 줄에 뜨는 로고와 같은 그림이라 머리글과 줄이 한 덩어리로 읽힌다.
 *
 * 대상이 둘 이상이면 업종 아이콘이다. `아웃백·VIPS 환급할인` 처럼 이름에 브랜드가 여럿
 * 들어간 혜택에 그중 하나의 로고만 걸면, 나머지 브랜드가 빠진 것처럼 읽힌다.
 */
function serviceIcon(service) {
  const url = service.targets.length === 1 ? service.targets[0].imageUrl : null
  return url ?? benefitCategoryIcon(service.name)
}

function won(value) {
  return `${value.toLocaleString('ko-KR')}원`
}
</script>

<template>
  <section class="rounded-2xl border border-line bg-white p-4">
    <header class="flex items-center gap-2">
      <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-icon-bg">
        <LayoutGrid :size="17" class="text-primary-dark" />
      </span>
      <h4 class="m-0 min-w-0 flex-1 truncate text-[16px] font-bold text-ink">{{ title }}</h4>
      <span class="flex-none rounded-full bg-icon-bg px-2 py-1 text-[10px] font-bold text-sub">
        통합 한도
      </span>
    </header>

    <template v-if="sharedLimit">
      <!--
        큰 숫자는 **잔여**다. 이 시트가 답하는 질문이 "이번 달에 얼마를 더 받을 수 있나" 라서,
        사용액을 크게 적으면 방향이 거꾸로 읽힌다. 왼쪽 문구만 "통합 사용" 이다.
      -->
      <div class="mt-3 flex items-baseline justify-between text-[13px] text-sub">
        <span>이번 달 통합 사용</span>
        <span>
          <em
            class="text-[18px] font-extrabold not-italic"
            :class="isExhausted ? 'text-muted' : 'text-primary-dark'"
          >
            잔여 {{ benefitUnitValue(sharedLimit.remainingValue, sharedLimit.limitUnit) }}
          </em>
          / {{ benefitUnitValue(sharedLimit.limitValue, sharedLimit.limitUnit) }}
        </span>
      </div>

      <!-- 조각 사이를 2px 띄운다. 붙여 놓으면 색이 서로 번져 경계가 안 보인다. -->
      <div class="mt-2 flex h-2 gap-[2px] overflow-hidden rounded-full bg-muted-softer">
        <span
          v-for="segment in barSegments"
          :key="segment.key"
          class="h-full rounded-full"
          :style="{ width: `${segment.width}%`, background: segment.color }"
        ></span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-sub">
        <span v-for="segment in segments" :key="segment.key" class="inline-flex items-center gap-1">
          <i class="inline-block h-2 w-2 rounded-sm" :style="{ background: segment.color }"></i>
          {{ segment.name }} {{ segment.usedLabel }}
        </span>
      </div>
    </template>

    <!--
      혜택 서비스 하나가 여러 브랜드를 덮는다. 서비스 머리글에 그 혜택만의 횟수·금액 한도를 적고,
      대상은 그 아래로 들여쓴다. 왼쪽 색 띠와 로고 색이 위 범례와 같아 어느 가맹점인지 이어진다.
    -->
    <div v-for="service in services" :key="service.key" class="mt-4 border-t border-line pt-3">
      <div class="flex items-center gap-2">
        <span
          class="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-xl bg-icon-bg"
        >
          <img :src="serviceIcon(service)" alt="" class="h-full w-full object-contain p-1" />
        </span>
        <b class="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{{ service.name }}</b>
        <span v-if="service.exhausted" class="exhausted">한도 소진</span>
        <span v-if="service.limitLabel" class="flex-none text-[12px] text-sub">
          {{ service.limitLabel }}
        </span>
      </div>

      <div v-for="target in service.targets" :key="target.key" class="mt-3">
        <!--
          색 띠는 **가맹점 줄에만** 붙인다. 바깥 상자에 걸면 아래 "총 N건 · 결제" 줄까지
          띠가 내려와, 그 줄이 다음 가맹점 것인지 이 가맹점 것인지 읽히지 않는다.
        -->
        <div
          class="flex items-center gap-3 pl-3"
          :style="{ boxShadow: `inset 3px 0 0 ${target.color}` }"
        >
          <!--
            대상 타일. 세 갈래다.
            1. 브랜드 로고가 있으면 로고.
            2. **대상이 브랜드가 아니라 업종일 때는 업종 아이콘.** `카페/디저트` · `병원`
               처럼 업종이 통째로 대상인 혜택이 있는데, 브랜드가 아니라 로고가 영영 없다.
               두 글자만 잘라 `카페` · `병원` 이라고 쓰면 **바로 위 혜택 머리글에는 아이콘이
               있는데 그 아래 줄만 글자**가 돼 한 덩어리로 안 읽힌다.
            3. 브랜드인데 로고를 못 구한 경우에만 이름 앞 두 글자를 계열색으로 대신한다.
               이때 일반 혜택 아이콘(선물 상자)을 넣으면 어느 가맹점인지 아무것도 못 알려준다.
          -->
          <span
            class="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-xl text-[11px] font-extrabold text-white"
            :class="{ 'bg-icon-bg': target.imageUrl || target.categoryIconUrl }"
            :style="target.imageUrl || target.categoryIconUrl ? null : { background: target.color }"
          >
            <!--
              칸을 가득 채운다. 로고가 `637×313`(아웃백)처럼 가로로 긴 것부터
              정사각(VIPS)까지 섞여 있어서, 이미지에 고정 크기를 주면 긴 쪽이 훨씬 작아 보인다.
              칸 기준으로 맞춰야 나란히 놓았을 때 크기가 같아 보인다.
            -->
            <img
              v-if="target.imageUrl"
              :src="target.imageUrl"
              alt=""
              class="h-full w-full object-contain p-0.5"
              @error="markLogoBroken(target.imageUrl)"
            />
            <!-- 업종 아이콘은 선 그림이라 여백을 더 준다. 혜택 머리글과 같은 크기로 보인다. -->
            <img
              v-else-if="target.categoryIconUrl"
              :src="target.categoryIconUrl"
              alt=""
              class="h-full w-full object-contain p-1.5"
            />
            <template v-else>{{ target.name.slice(0, 2) }}</template>
          </span>
          <span class="min-w-0 flex-1">
            <b class="block truncate text-[15px] font-bold text-ink">{{ target.name }}</b>
            <span v-if="target.value" class="mt-0.5 block text-[12px] text-sub">
              {{ target.value }}
            </span>
          </span>
          <span v-if="target.perTransactionLimit" class="flex-none text-[12px] text-sub">
            {{ target.perTransactionLimit }}
          </span>
        </div>

        <!-- 결제가 한 건도 없으면 적지 않는다. "총 0건 · 0원 결제" 는 알려주는 게 없다. -->
        <div
          v-if="target.transactionCount"
          class="mt-2 flex items-baseline justify-between border-t border-line pt-2 text-[12px] text-sub"
        >
          <span
            >총 {{ target.transactionCount }}건 · {{ won(target.totalPaymentAmount) }} 결제</span
          >
          <b class="flex-none text-[13px] font-bold text-received">{{ target.received }}</b>
        </div>
      </div>
    </div>
  </section>
</template>
