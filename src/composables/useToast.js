import { ref } from 'vue'

/**
 * 사용자에게 보이는 에러의 유일한 창구.
 *
 * alert() 를 쓰지 않는다. 화면마다 에러 표시 방식이 갈리지 않게 여기로 모은다.
 *
 *   const { showToast } = useToast()
 *   showToast('일시적인 오류가 발생했어요')
 *
 * 검증 실패(400 INVALID_INPUT_VALUE)는 여기로 보내지 않는다.
 * 어느 입력창이 문제인지 알려주지 못하므로 BaseInput 의 error 로 넘긴다.
 */

// 모듈 스코프에 둔다. useToast() 를 어느 화면에서 부르든 같은 목록을 본다.
// 컴포저블 안에 두면 부를 때마다 새 목록이 생겨 BaseToast 가 아무것도 못 그린다.
const toasts = ref([])

let nextId = 0

export function useToast() {
  function removeToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  /**
   * @param message 사용자에게 보일 문구.
   *   400/404/409 비즈니스 에러는 백엔드 message 를 그대로 넘긴다.
   *   500·네트워크는 "일시적인 오류가 발생했어요" 로 통일한다.
   */
  function showToast(message, { duration = 3000 } = {}) {
    const id = nextId++
    toasts.value.push({ id, message })

    // duration 을 0 으로 주면 자동으로 사라지지 않는다. 직접 removeToast 한다.
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }

  return { toasts, showToast, removeToast }
}
