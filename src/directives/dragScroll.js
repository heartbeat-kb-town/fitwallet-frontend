/**
 * 가로 스크롤 영역을 마우스로 잡아끌 수 있게 해주는 커스텀 디렉티브 (`v-drag-scroll`).
 *
 * 터치·트랙패드는 브라우저 기본 스크롤을 그대로 쓰고, 마우스일 때만 동작한다.
 *
 * `HomeView` 안에 있던 것을 파일로 뺐다. 카드 혜택 현황이 리포트로 옮겨가면서
 * 홈(자주 찾는 장소)과 리포트(카드 혜택 현황) 두 곳이 같은 디렉티브를 쓰게 됐다.
 * 커서 모양(`.horizontal-scroll.dragging`)은 `style.css` 가 들고 있다.
 */
export const vDragScroll = {
  mounted(el) {
    let pointerId = null
    let startX = 0
    let startScrollLeft = 0
    let dragged = false

    const onPointerDown = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      pointerId = event.pointerId
      startX = event.clientX
      startScrollLeft = el.scrollLeft
      dragged = false
    }

    const onPointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      const deltaX = event.clientX - startX
      if (!dragged && Math.abs(deltaX) > 6) {
        dragged = true
        el.setPointerCapture(pointerId)
        el.style.scrollSnapType = 'none'
        el.classList.add('dragging')
      }
      if (dragged) {
        el.scrollLeft = startScrollLeft - deltaX
        event.preventDefault()
      }
    }

    const endDrag = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      pointerId = null
      el.classList.remove('dragging')
      el.style.scrollSnapType = ''
      // 드래그 직후 발생하는 클릭 한 번을 막은 뒤 상태를 초기화한다
      window.setTimeout(() => {
        dragged = false
      }, 0)
    }

    const onClickCapture = (event) => {
      if (dragged) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', onClickCapture, true)

    el._dragScrollCleanup = () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', onClickCapture, true)
    }
  },
  unmounted(el) {
    el._dragScrollCleanup?.()
  },
}
