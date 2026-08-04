import { ref } from 'vue'

/**
 * 비동기 호출의 data / isLoading / error 를 한 벌로 묶어준다.
 *
 * store 의 비동기 action 은 반드시 이걸 경유한다.
 * isLoading·error·try-catch 를 손으로 짜면 사람마다 모양이 갈린다.
 *
 * @param fn 실행할 비동기 함수 (보통 api/{도메인}Api.js 의 함수)
 * @param initialValue data 의 초기값. v-for 로 도는 값이면 반드시 [] 를 넘긴다.
 */
export function useAsyncState(fn, initialValue = null) {
  const data = ref(initialValue) // 초기값을 받아야 v-for 가 터지지 않는다
  const isLoading = ref(false)
  const error = ref(null)

  async function execute(...args) {
    isLoading.value = true
    error.value = null
    try {
      return (data.value = await fn(...args))
    } catch (e) {
      error.value = e
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return { data, isLoading, error, execute }
}
