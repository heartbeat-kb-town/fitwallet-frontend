/**
 * 배포 환경의 `/api/*` 프록시.
 *
 * 개발 서버는 vite proxy 가 `/api` 를 백엔드로 넘겨주지만(vite.config.js),
 * 그 프록시는 `npm run dev` 에만 있다. 빌드 결과물에는 없다.
 * 배포본에서 같은 역할을 하는 것이 이 Worker 다 (#62).
 *
 *   브라우저 ──HTTPS──▶ Worker ──HTTP──▶ 백엔드(Elastic Beanstalk)
 *
 * 브라우저가 보기엔 화면과 API 가 같은 오리진이다. 그래서
 *   - CORS 설정이 필요 없다. 크로스 오리진이 아니라 preflight 자체가 발생하지 않는다
 *   - refreshToken 쿠키의 `SameSite=Strict` 가 그대로 통한다. 백엔드 수정이 필요 없다
 *   - 백엔드가 http 여도 mixed content 로 차단되지 않는다. 브라우저는 https 만 본다
 *
 * ⚠️ Worker ↔ 백엔드 구간은 평문 HTTP 다. 로그인 요청의 비밀번호와 토큰이
 *    암호화 없이 지나간다. 백엔드에 HTTPS 를 붙이려면 커스텀 도메인이 필요하고
 *    (`*.elasticbeanstalk.com` 은 ACM 인증서를 발급받을 수 없다) 아직 도메인이 없다.
 *    팀원·테스트 계정만 쓰는 동안의 한시적 타협이다. 실사용자를 받기 전에 반드시 해소한다 (#82).
 *
 * 경로 분기는 이 코드가 아니라 wrangler.jsonc 의 `run_worker_first` 가 한다.
 * `/api/*` 만 여기로 오고 나머지는 전부 정적 자산(dist)으로 간다.
 */

// 실패해도 백엔드와 **같은 봉투 모양**으로 돌려준다.
// client.js 인터셉터가 이 모양을 전제로 ApiError 를 만들기 때문이다.
// 여기서 HTML 에러 페이지가 나가면 화면은 조용히 실패하고 사용자는 아무것도 보지 못한다.
const envelope = (status, code, message) =>
  Response.json({ success: false, code, message, data: null, errors: [] }, { status })

export default {
  async fetch(request, env) {
    if (!env.BACKEND_ORIGIN) {
      return envelope(500, 'PROXY_MISCONFIGURED', 'BACKEND_ORIGIN 이 설정되지 않았습니다.')
    }

    const { pathname, search } = new URL(request.url)
    const target = new URL(pathname + search, env.BACKEND_ORIGIN)

    try {
      // 응답을 손대지 않고 그대로 흘린다. `Set-Cookie` 도 마찬가지다.
      // 백엔드가 내려준 `HttpOnly; SameSite=Strict` 가 그대로 브라우저에 닿고,
      // 응답에 Domain 속성이 없으므로 브라우저가 이 Worker 도메인의 쿠키로 저장한다.
      //
      // `Secure` 를 덧붙이는 것도 검토했지만 하지 않는다. workers.dev 는 HTTPS 전용이라
      // 실익이 없고, 프록시가 응답을 고치기 시작하면 개발(vite)과 배포(Worker)의 동작이
      // 갈린다. #62 가 없애려던 것이 정확히 그런 종류의 차이다.
      return await fetch(new Request(target, request))
    } catch {
      return envelope(502, 'BACKEND_UNREACHABLE', '백엔드에 연결하지 못했습니다.')
    }
  },
}
