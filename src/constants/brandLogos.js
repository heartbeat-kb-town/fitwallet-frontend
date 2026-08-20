/**
 * 브랜드 로고 주소.
 *
 * ⚠️ **임시방편이다.** 로고의 제자리는 백엔드 `brand.brand_image_url` 이고,
 * 응답도 이미 그 자리를 갖고 있다 (`brandImageUrl` · `targetImageUrl`).
 * 그런데 시드의 브랜드 59건이 **전부 NULL** 이라 화면에 그릴 그림이 없다.
 * 백엔드가 그 컬럼을 채우면 이 파일은 통째로 지운다 — 화면은 응답 값을 **먼저** 보고,
 * 없을 때만 여기를 본다.
 *
 * 값은 대부분 구글 파비콘 서비스다. 브랜드 사이트의 아이콘을 대신 받아 주는데,
 * 사이트에 따라 없는 곳이 있어 **실제로 그림이 나오는 것만 넣었다.**
 * 지구본(기본 아이콘)이 나오거나 다른 회사 로고가 나오는 브랜드는 일부러 뺐다 —
 * 엉뚱한 로고보다 이름 이니셜 타일이 낫다. (2026-08-14 눈으로 확인)
 *
 * 파비콘이 없는 몇 곳은 사이트의 `favicon.ico` 를 직접 가리킨다.
 *
 * 목록에 없는 브랜드는 `SharedLimitGroupCard` 가 계열색 이니셜 타일로 그린다.
 * 주소가 죽어 이미지 로드에 실패해도 같은 타일로 떨어진다.
 */

/**
 * 구글 파비콘 서비스로 브랜드 사이트 아이콘을 받는다.
 *
 * **`sz=256` 이다.** 128 로 받으면 고해상도 화면에서 40px 타일이 흐릿하다 —
 * 브라우저가 물리 픽셀 기준으로 그리기 때문이다.
 */
const favicon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`

/** 구글이 못 찾는 사이트를 덕덕고 쪽이 갖고 있는 경우가 있다. 커피빈·파리바게뜨가 그렇다. */
const ddgFavicon = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`

export const BRAND_LOGOS = {
  '11번가': favicon('11st.co.kr'),
  '29CM': favicon('29cm.co.kr'),
  AK몰: favicon('akplaza.com'),
  GS25: favicon('gs25.gsretail.com'),
  G마켓: favicon('gmarket.co.kr'),
  HD현대오일뱅크: favicon('oilbank.com'),
  SK에너지: favicon('skenergy.com'),
  'SSG.COM': favicon('ssg.com'),
  VIPS: favicon('ivips.co.kr'),
  네이버쇼핑: favicon('naver.com'),
  '네이버플러스 스토어': favicon('naver.com'),
  다이소: favicon('daisomall.co.kr'),
  던킨도너츠: favicon('dunkindonuts.co.kr'),
  롯데마트: favicon('lottemart.com'),
  롯데몰: favicon('lotteon.com'),
  롯데월드타워: favicon('lwt.co.kr'),
  롯데홈쇼핑: favicon('lotteimall.com'),
  마켓컬리: favicon('kurly.com'),
  컬리: favicon('kurly.com'),
  메가MGC커피: favicon('mega-mgccoffee.com'),
  무신사: favicon('musinsa.com'),
  배달의민족: favicon('baemin.com'),
  배스킨라빈스: favicon('baskinrobbins.co.kr'),
  스타벅스: favicon('starbucks.co.kr'),
  스타필드: favicon('starfield.co.kr'),
  에이블리: favicon('a-bly.com'),
  옥션: favicon('auction.co.kr'),
  올리브영: favicon('oliveyoung.co.kr'),
  요기요: favicon('yogiyo.co.kr'),
  이디야커피: favicon('ediya.com'),
  이마트: favicon('emart.ssg.com'),
  트레이더스: favicon('traders.ssg.com'),
  지그재그: favicon('zigzag.kr'),
  쿠팡: favicon('coupang.com'),
  텐바이텐: favicon('10x10.co.kr'),
  투썸플레이스: favicon('twosome.co.kr'),
  티켓몬스터: favicon('tmon.co.kr'),
  파스쿠찌: favicon('pascucci.com'),
  포잉: favicon('poing.co.kr'),

  // 구글이 못 찾고 덕덕고가 갖고 있는 곳.
  파리바게뜨: ddgFavicon('paris.co.kr'),
  땡겨요: ddgFavicon('ddangyo.com'),

  /*
   * 파비콘이 16~32px 짜리라 타일에서 뭉개지던 곳. **사이트가 쓰는 로고 원본**을 직접 가리킨다.
   * 파비콘 서비스로도 그림은 나왔지만 확대된 그림이라 흐렸다.
   */
  // CU 는 파비콘도 사이트 로고(115×24)도 작아서 뭉갰다. 공유용 이미지가 300×300 이라 이걸 쓴다.
  CU: 'https://cu.bgfretail.com/images/facebook.jpg',
  세븐일레븐: 'https://www.7-eleven.co.kr/front/img/com/logo.png',
  커피빈: 'https://www.coffeebeankorea.com/images/common/logo_340_new.png',
  이마트24: 'https://www.emart24.co.kr/assets/assets/imgs/logo.png',

  // 브랜드 사이트가 응답하지 않아 롯데쇼핑 쪽 이미지를 쓴다. DB 에 표기가 둘이라 둘 다 넣는다.
  엔젤리너스:
    'https://culture.lotteshopping.com/LDCS/COMMON/IMAGES/NAMO/IMAGES/0001/55/9990/1555746695017.jpg',
  엔제리너스:
    'https://culture.lotteshopping.com/LDCS/COMMON/IMAGES/NAMO/IMAGES/0001/55/9990/1555746695017.jpg',

  // 둘 다 못 찾는 곳. 사이트 아이콘을 직접 가리킨다.
  홈플러스: 'https://www.homeplus.co.kr/favicon.ico',
  GS칼텍스: 'https://www.gscaltex.com/favicon.ico',
  쿠팡이츠: 'https://www.coupangeats.com/favicon.ico',

  아웃백:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT47zd7CxvgK01rdy8Y6l0lf77I3EnyKmgE_WwbJD8aiQ&s=10',
}

/**
 * 로고를 못 구한 브랜드 — `S-OIL` · `농협하나로마트` · `아웃백`(국내 도메인) 등.
 *
 * 억지로 다른 회사 아이콘을 넣지 않았다 — `lotteeatz.com` 을 시험 삼아 넣어 보니
 * 엔젤리너스 자리에 롯데이츠 로고가 떴다. 이런 브랜드는 계열색 이니셜 타일로 그린다.
 */
