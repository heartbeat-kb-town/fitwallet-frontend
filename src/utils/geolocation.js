/**
 * 현재 좌표 구하기.
 *
 * 가맹점 조회(`GET /api/store/search`)가 위도·경도를 필수로 요구한다.
 * 좌표 없이 부르면 400 이라 화면이 요청을 내보내기 전에 여기서 값을 확정한다.
 */

/**
 * 위치를 못 구했을 때 쓰는 좌표. 광진구 세종대 일대다.
 *
 * TODO(#89): **시연 데이터에 맞춘 임시값이지 제품 동작이 아니다.**
 *            시드 가맹점이 전부 이 근처에 있어서, 다른 좌표로 떨어지면
 *            반경 안에 아무것도 없어 "검색이 고장 난 것처럼" 보인다.
 *            가맹점 데이터가 전국으로 넓어지면 이 폴백을 지우고
 *            위치를 못 구한 상태를 화면에 그대로 알리는 편이 낫다.
 */
export const FALLBACK_COORDINATES = { latitude: 37.5481, longitude: 127.0732 }

// 위치를 오래 기다리면 화면이 빈 채로 멈춘 것처럼 보인다. 그전에 폴백으로 넘어간다.
const TIMEOUT_MS = 5000

/**
 * 현재 좌표를 돌려준다. **실패하지 않는다.**
 *
 * 사용자가 권한을 거부했거나 브라우저가 지원하지 않거나 시간이 오래 걸리면
 * `FALLBACK_COORDINATES` 를 준다. 호출부가 매번 실패를 분기하지 않아도 되도록
 * "좌표는 항상 있다" 로 계약을 단순하게 잡았다.
 *
 * @returns `{ latitude, longitude }`
 */
export function getCurrentCoordinates() {
  if (!navigator.geolocation) return Promise.resolve(FALLBACK_COORDINATES)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(FALLBACK_COORDINATES),
      { timeout: TIMEOUT_MS },
    )
  })
}
