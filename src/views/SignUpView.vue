<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PasswordEye from '@/components/PasswordEye.vue'

const router = useRouter()

const name = ref('')
const id = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const passwordVisible = ref(false)
const passwordConfirmVisible = ref(false)
const agreed = ref(false)

const passwordMatches = computed(() => password.value === passwordConfirm.value)
const canSubmit = computed(
  () => name.value && id.value && password.value && passwordMatches.value && agreed.value,
)

function goToLogin() {
  router.push({ name: 'login' })
}

// TODO(#27): 실제 가입 연동(POST /api/user/signup)은 별도 이슈다.
//            지금은 기존 프로토타입과 동일하게 PIN 등록 화면으로 넘어가기만 한다.
//            PIN 은 아직 셸에 있어 임시 query 를 쓴다 (PinPadView 이관 시 사라진다).
//            셸이 새로 마운트되므로 registeredPin·confirmPin 은 빈 값으로 시작한다.
function submit() {
  if (canSubmit.value) router.push({ name: 'app-shell', query: { screen: 'pin-register' } })
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
        <div class="input-wrap">
          <AppIcon name="user" />
          <input v-model="name" placeholder="홍길동" />
        </div>
      </label>

      <label class="field">
        <span>아이디</span>
        <div class="input-wrap">
          <AppIcon name="user" />
          <input v-model="id" placeholder="아이디를 입력하세요" />
        </div>
      </label>

      <label class="field">
        <span>휴대폰 번호</span>
        <div class="input-wrap">
          <AppIcon name="phone" />
          <input v-model="phone" type="tel" placeholder="010-0000-0000" />
        </div>
      </label>

      <label class="field">
        <span>비밀번호</span>
        <div class="input-wrap">
          <AppIcon name="lock" />
          <input
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="8자리 이상 입력"
          />
          <PasswordEye :visible="passwordVisible" @toggle="passwordVisible = !passwordVisible" />
        </div>
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

      <button class="signup-submit" :class="{ enabled: canSubmit }" type="submit">가입하기</button>
    </form>
  </div>
</template>
