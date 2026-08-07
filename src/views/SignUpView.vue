<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PasswordEye from '@/components/PasswordEye.vue'
import { useAuthStore, AutoLoginError } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'

// 백엔드 SignUpRequest 의 @Size(min = 8) 과 같은 값이다. 한쪽만 고치면 화면이 통과시킨 값을
// 서버가 되돌려보낸다.
const PASSWORD_MIN_LENGTH = 8

const router = useRouter()
const authStore = useAuthStore()
const { showToast } = useToast()

const name = ref('')
const id = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const passwordVisible = ref(false)
const passwordConfirmVisible = ref(false)
const agreed = ref(false)

// 400 INVALID_INPUT_VALUE 의 필드별 사유. 검증 실패는 토스트로 띄우지 않는다 —
// 어느 입력창이 문제인지 알려주지 못한다 (CLAUDE.md "에러 처리").
const fieldErrors = ref({})

const passwordMatches = computed(() => password.value === passwordConfirm.value)
const passwordTooShort = computed(
  () => Boolean(password.value) && password.value.length < PASSWORD_MIN_LENGTH,
)

// phone 은 백엔드가 @NotBlank 로 요구한다. 여기서 안 막으면 400 을 받고서야 알게 된다.
const canSubmit = computed(
  () =>
    name.value &&
    id.value &&
    phone.value &&
    password.value &&
    !passwordTooShort.value &&
    passwordMatches.value &&
    agreed.value,
)

function goToLogin() {
  router.push({ name: 'login' })
}

/**
 * 가입 실패를 화면에 옮긴다.
 *
 * 검증 실패는 입력창 아래로, 비즈니스 에러는 백엔드 message 를 토스트로 그대로 보여준다.
 * 500·네트워크는 사용자가 할 수 있는 게 없으므로 문구를 하나로 통일한다.
 */
function showSignupError(error) {
  // 계정은 이미 만들어졌다. 가입 실패로 안내하면 사용자가 아이디 중복에 부딪힌다.
  if (error instanceof AutoLoginError) {
    showToast('가입은 완료됐어요. 로그인 후 결제 비밀번호를 등록해 주세요.')
    router.push({ name: 'login' })
    return
  }

  if (error.code === 'INVALID_INPUT_VALUE') {
    fieldErrors.value = Object.fromEntries(error.errors.map(({ field, reason }) => [field, reason]))
    return
  }

  // code 가 없으면 응답 봉투 자체가 없었던 것이다 (네트워크 끊김 등).
  const isUnexpected = !error.code || error.status >= 500
  showToast(isUnexpected ? '일시적인 오류가 발생했어요' : error.message)
}

/**
 * 가입 → 자동 로그인 → PIN 등록.
 *
 * 서버 호출을 여기서 한다. PIN 두 번 입력이 끝난 뒤로 미루면 아이디 중복(409)을
 * 6자리를 두 번 친 다음에야 알게 된다.
 */
async function submit() {
  if (!canSubmit.value || authStore.isSignupLoading) return

  fieldErrors.value = {}

  try {
    await authStore.signup({
      name: name.value,
      loginId: id.value,
      phone: phone.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      // 약관이 전체동의 하나뿐이라 동의하면 [선택] 마케팅까지 함께 동의한 것이 된다.
      // 선택 항목을 분리하는 것은 별도 이슈다 (#109 본문 참고).
      marketingAgreed: agreed.value,
    })
    router.push({ name: 'pin-register' })
  } catch (error) {
    showSignupError(error)
  }
}
</script>

<template>
  <div class="screen signup-screen">
    <header class="flow-header left-title">
      <button type="button" aria-label="로그인으로 돌아가기" @click="goToLogin()">
        <AppIcon name="back" :size="22" />
      </button>
      <h1>회원가입</h1>
    </header>

    <form class="signup-form" @submit.prevent="submit">
      <label class="field">
        <span>이름</span>
        <div class="input-wrap" :class="{ error: fieldErrors.name }">
          <AppIcon name="user" />
          <input v-model="name" placeholder="홍길동" />
        </div>
        <small v-if="fieldErrors.name" class="validation error-text">{{ fieldErrors.name }}</small>
      </label>

      <label class="field">
        <span>아이디</span>
        <div class="input-wrap" :class="{ error: fieldErrors.loginId }">
          <AppIcon name="user" />
          <input v-model="id" placeholder="아이디를 입력하세요" />
        </div>
        <small v-if="fieldErrors.loginId" class="validation error-text">{{
          fieldErrors.loginId
        }}</small>
      </label>

      <label class="field">
        <span>휴대폰 번호</span>
        <div class="input-wrap" :class="{ error: fieldErrors.phone }">
          <AppIcon name="phone" />
          <input v-model="phone" type="tel" placeholder="010-0000-0000" />
        </div>
        <small v-if="fieldErrors.phone" class="validation error-text">{{
          fieldErrors.phone
        }}</small>
      </label>

      <label class="field">
        <span>비밀번호</span>
        <div class="input-wrap" :class="{ error: passwordTooShort || fieldErrors.password }">
          <AppIcon name="lock" />
          <input
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="8자리 이상 입력"
          />
          <PasswordEye :visible="passwordVisible" @toggle="passwordVisible = !passwordVisible" />
        </div>
        <small v-if="passwordTooShort" class="validation error-text"
          >비밀번호는 8자 이상이어야 합니다.</small
        >
        <small v-else-if="fieldErrors.password" class="validation error-text">{{
          fieldErrors.password
        }}</small>
      </label>

      <label class="field">
        <span>비밀번호 확인</span>
        <div class="input-wrap" :class="{ error: passwordConfirm && !passwordMatches }">
          <AppIcon name="lock" />
          <input
            v-model="passwordConfirm"
            :type="passwordConfirmVisible ? 'text' : 'password'"
            placeholder="비밀번호를 다시 입력하세요"
          />
          <PasswordEye
            :visible="passwordConfirmVisible"
            @toggle="passwordConfirmVisible = !passwordConfirmVisible"
          />
        </div>
        <small v-if="passwordConfirm && !passwordMatches" class="validation error-text"
          >비밀번호가 일치하지 않습니다.</small
        >
        <small v-else-if="passwordConfirm && passwordMatches" class="validation success-text"
          >비밀번호가 일치합니다.</small
        >
      </label>

      <section class="terms-card">
        <button class="all-terms" type="button" @click="agreed = !agreed">
          <span class="checkbox" :class="{ checked: agreed }">
            <svg v-if="agreed" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="#1A1A1A"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <b>전체 약관에 동의합니다</b>
        </button>
        <div class="terms-divider"></div>
        <div
          v-for="term in [
            '[필수] 서비스 이용약관 동의',
            '[필수] 개인정보 수집 및 이용 동의',
            '[선택] 마케팅 정보 수신 동의',
          ]"
          :key="term"
          class="term-row"
        >
          <span>{{ term }}</span>
          <AppIcon name="chevron" :size="14" />
        </div>
      </section>

      <button
        class="signup-submit"
        :class="{ enabled: canSubmit }"
        type="submit"
        :disabled="!canSubmit || authStore.isSignupLoading"
      >
        {{ authStore.isSignupLoading ? '가입 중…' : '가입하기' }}
      </button>
    </form>
  </div>
</template>
