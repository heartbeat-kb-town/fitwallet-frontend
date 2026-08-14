/**
 * 혜택 값에 표시 단위를 붙인다.
 *
 * 단위는 **응답이 알려준다** (`limitUnit` · `valueUnit`). 화면이 혜택 종류로 추측하지 않는다 —
 * 한 카드 안에 할인(원)·적립(P)·횟수(회) 한도가 섞여 있다.
 *
 * ⚠️ **`COUNT` 를 빠뜨리면 조용히 틀린다.** 예전 `limitAmount()` 는 `POINT` 만 보고
 * 나머지를 전부 `원` 으로 적었는데, 신한 Pick E 체크의 월 3회 한도가 `1원 / 3원` 으로 떴다.
 * 금액이 아니라 **횟수**라 `1회 / 3회` 가 맞다. 단위는 반드시 전부 분기한다.
 *
 * @param unit 백엔드 `CardMonthlyBenefitUnit` — `KRW` · `POINT` · `COUNT` · `PERCENT`
 */
export function benefitUnitValue(value, unit) {
  const amount = (Number(value) || 0).toLocaleString('ko-KR')

  switch (unit) {
    case 'POINT':
      return `${amount}P`
    case 'COUNT':
      return `${amount}회`
    case 'PERCENT':
      return `${amount}%`
    default:
      return `${amount}원`
  }
}
