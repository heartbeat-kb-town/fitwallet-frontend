import { ref } from 'vue'
import jsQR from 'jsqr'

/**
 * 카메라로 QR 을 읽는다.
 *
 * `jsQR` 은 픽셀 배열만 받는 순수 디코더라 카메라를 직접 다뤄야 한다. 그래서 이 파일이
 * `getUserMedia` → `<video>` → `<canvas>` → `jsQR` 파이프라인을 통째로 들고 있다.
 * 화면은 `<video>` 자리만 내주면 된다.
 *
 * ⚠️ **카메라는 보안 컨텍스트에서만 열린다.** `https` 이거나 `localhost` 여야 한다.
 * 개발(`localhost:5173`)과 배포(Workers, https) 둘 다 해당하므로 실제로 문제되지 않는다.
 */
export function useQrScanner() {
  const isScanning = ref(false)

  /** 화면에 그대로 보여줄 실패 사유. 권한 거부와 카메라 없음은 사용자 행동이 다르다. */
  const error = ref('')

  let stream = null
  let frameHandle = 0
  let canvas = null

  /**
   * 카메라를 열고 프레임마다 QR 을 찾는다.
   *
   * @param video 미리보기를 붙일 `<video>` 엘리먼트
   * @param onDecode QR 을 읽으면 그 문자열로 한 번 호출된다. **호출 후 스캔은 멈춘다** —
   *   같은 QR 이 다음 프레임에도 잡혀서 결제가 두 번 나가면 안 된다.
   */
  async function start(video, onDecode) {
    if (isScanning.value) return
    error.value = ''

    try {
      // 후면 카메라를 선호하되 없으면 아무거나 쓴다. 노트북은 전면뿐이라 exact 로 걸면 실패한다.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
    } catch (cause) {
      error.value = describe(cause)
      return
    }

    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    await video.play().catch(() => {})

    canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    isScanning.value = true

    const tick = () => {
      if (!isScanning.value) return

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const frame = context.getImageData(0, 0, canvas.width, canvas.height)
        // 반전 시도는 끈다. 매장 QR 은 정상 대비이고, 켜면 프레임마다 두 배로 훑는다.
        const code = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code?.data) {
          stop()
          onDecode(code.data)
          return
        }
      }

      frameHandle = requestAnimationFrame(tick)
    }

    frameHandle = requestAnimationFrame(tick)
  }

  /** 카메라를 끈다. **트랙을 직접 멈춰야 캠 불이 꺼진다** — srcObject 만 비우면 계속 켜져 있다. */
  function stop() {
    isScanning.value = false
    cancelAnimationFrame(frameHandle)
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    canvas = null
  }

  return { isScanning, error, start, stop }
}

/** getUserMedia 의 실패 사유를 사용자가 할 수 있는 행동으로 옮긴다. */
function describe(cause) {
  if (cause.name === 'NotAllowedError' || cause.name === 'SecurityError') {
    return '카메라 사용을 허용해 주세요. 주소창 옆에서 다시 켤 수 있어요.'
  }
  if (cause.name === 'NotFoundError' || cause.name === 'OverconstrainedError') {
    return '사용할 수 있는 카메라를 찾지 못했어요.'
  }
  if (cause.name === 'NotReadableError') {
    return '다른 앱이 카메라를 쓰고 있어요. 종료한 뒤 다시 시도해 주세요.'
  }
  return '카메라를 열지 못했어요.'
}
