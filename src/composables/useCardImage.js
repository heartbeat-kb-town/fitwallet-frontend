import { ref } from 'vue'

/**
 * 카드 이미지를 카드 그림 칸에 앉히는 공용 처리.
 *
 * 카드사 이미지는 **방향이 섞여 있다.** KB·신한은 가로(약 1.58)인데 현대는 세로(604×956)다.
 * 가로 칸에 세로 이미지를 그냥 채우면 위쪽 35%만 남아 어느 카드인지 알 수 없다.
 *
 * **URL 로는 방향을 알 수 없다.** 신한 `..._v_f_s.png` 가 실제로는 가로고,
 * 현대 `card_ZWK_h.png` 는 `_h` 가 붙었는데 세로다. 그래서 이미지가 로드된 뒤
 * 실제 크기(`naturalWidth`/`naturalHeight`)로 판별한다.
 *
 *   const { markCardImageOrientation, cardImageStyle } = useCardImage()
 *
 *   <img :src="card.cardImageUrl"
 *        :style="cardImageStyle(card.cardImageUrl, 76 / 48)"
 *        @load="markCardImageOrientation" />
 */

/**
 * 세로로 확인된 이미지 URL.
 *
 * **카드 id 가 아니라 URL 로 기억한다.** 방향은 카드가 아니라 이미지의 성질이라
 * 화면마다 다시 판별할 이유가 없고, 화면마다 카드를 가리키는 키가 다르기 때문이다
 * (가맹점 화면은 `userCardId`, 리포트의 카드 추천은 `cardProductId` 다).
 * id 로 기억하면 두 화면의 2번 카드가 서로 다른 카드인데 같은 칸을 차지한다.
 *
 * 모듈 스코프에 둬서 앱 전체가 한 벌을 공유한다. 같은 이미지를 두 번 재지 않는다.
 */
const portraitImageUrls = ref(new Set())

/** 카드 그림 칸의 기본 비율. 실제 카드 비율(약 1.58)에 맞춘 칸이 대부분이다. */
export const CARD_RATIO = 1.58

export function useCardImage() {
  /**
   * `<img>` 의 `@load` 에 그대로 건다. 세로 이미지만 기억한다.
   *
   * 가로는 기본값이라 기록할 것이 없고, 로드에 실패한 이미지는 크기가 0 이라 걸러진다.
   */
  function markCardImageOrientation(event) {
    const image = event.target
    const { naturalWidth, naturalHeight } = image
    if (!naturalWidth || naturalWidth >= naturalHeight) return

    // Set 을 새로 만들어야 반응형이 걸린다.
    portraitImageUrls.value = new Set(portraitImageUrls.value).add(image.currentSrc || image.src)
  }

  /**
   * 카드 그림을 칸에 어떻게 앉힐지.
   *
   * 가로 이미지는 칸을 그냥 채운다. 세로 이미지는 **눕힌다** — 반시계로 90도 돌리면
   * 가로세로가 뒤바뀌므로, 돌리기 전 크기를 뒤집어 놔야 돌린 뒤에 칸을 채운다.
   *
   *   너비 = 칸 높이 = 칸 너비 ÷ 비율  →  칸 너비의 (100 ÷ 비율)%
   *   높이 = 칸 너비 = 칸 높이 × 비율  →  칸 높이의 (비율 × 100)%
   *
   * @param imageUrl 방향을 기억해 둔 키. `<img>` 에 넣는 URL 을 그대로 넘긴다.
   * @param boxRatio **칸의** 가로세로 비율이다. 카드의 비율이 아니다.
   *   눕힐 때 얼마나 키울지가 칸 모양으로 정해지므로, 칸이 카드보다 넓으면 그 값을 넘겨야 한다
   *   (결제 화면의 칸은 344×198 이라 1.74 다).
   */
  function cardImageStyle(imageUrl, boxRatio = CARD_RATIO) {
    if (!portraitImageUrls.value.has(imageUrl)) {
      return { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' }
    }

    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${100 / boxRatio}%`,
      height: `${boxRatio * 100}%`,
      objectFit: 'cover',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
    }
  }

  return { markCardImageOrientation, cardImageStyle }
}
