// 상단바 높이. AppHeader(높이 자체)와 DefaultLayout(본문 상단 여백)이 같은 값을 참조해야
// 내용이 상단바에 가리지 않는다 — 값 수정 시 이 한 곳만 바꾸면 된다.
// 모든 타입 동일 68px. 카테고리처럼 줄이 더 필요한 경우도 이 높이 안에서 글씨 크기·간격으로 맞춘다.
export const HEADER_LAYOUT = { height: 'h-[68px]', paddingTop: 'pt-[68px]' }

export function getHeaderLayout() {
  return HEADER_LAYOUT
}
