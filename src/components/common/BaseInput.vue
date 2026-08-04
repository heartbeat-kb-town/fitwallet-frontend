<script setup>
import { useId } from 'vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  /**
   * 인라인 에러 메시지. 검증 실패는 토스트로 띄우지 않는다.
   * 어느 입력창이 문제인지 알려주지 못하면 사용자가 고칠 수 없다.
   *
   * 백엔드 검증 실패(400 INVALID_INPUT_VALUE)는 그대로 꽂으면 된다:
   *   :error="apiError?.reasonFor('loginId')"
   */
  error: { type: String, default: '' },
  isDisabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
})

defineEmits(['update:modelValue'])

// 라벨과 입력창을 묶는 id. 라벨을 눌러도 입력창에 포커스가 가고,
// 스크린리더가 어느 칸을 읽는지 알 수 있다.
const inputId = useId()
const errorId = `${inputId}-error`
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="text-[13px] font-bold text-ink">
      {{ label }}
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :autocomplete="autocomplete"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? errorId : undefined"
      class="w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] text-ink transition-colors outline-none placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      :class="error ? 'border-danger' : 'border-line'"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <!-- 에러가 없을 때 자리를 비워두지 않는다.
         메시지가 나타날 때마다 아래 요소들이 밀리는 게 더 거슬린다는 판단이다.
         화면에서 이 흔들림이 문제가 되면 그때 min-h 로 자리를 잡는다. -->
    <p v-if="error" :id="errorId" class="text-[13px] text-danger">
      {{ error }}
    </p>
  </div>
</template>
