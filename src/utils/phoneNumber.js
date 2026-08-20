// 백엔드 users.phone 은 VARCHAR(20) 이고 SignUpRequest 도 @Size(max = 20) 이다.
// 하이픈 둘을 더해도 13자라 여유가 있지만, 자릿수를 여기서 막아 애초에 넘길 수 없게 한다.
const MAX_DIGITS = 11

/**
 * 휴대폰 번호에 하이픈을 넣는다.
 *
 * 백엔드는 `@NotBlank` + `@Size(max = 20)` 만 걸어 두고 형식을 강제하지 않는다.
 * 그래서 **형식을 맞추는 것은 프론트 몫이다.** 실제로 로컬 DB 가 갈라져 있었다 —
 * 시드 계정은 `010-1234-5678` 인데 가입 화면으로 만든 계정은 `0101101011` 이었다.
 *
 * 가운데 묶음 길이가 자릿수에 따라 다르다. 11자리는 `010-1234-5678`,
 * 10자리는 `011-123-4567` 이다. 전부 4로 고정하면 옛 번호가 `011-1234-567` 로 깨진다.
 *
 * 숫자 아닌 문자는 전부 버리므로 이미 하이픈이 든 값을 다시 넣어도 결과가 같다
 * (입력 이벤트마다 부르기 때문에 이 성질이 필요하다).
 */
export function formatPhoneNumber(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, MAX_DIGITS)

  // 하이픈을 3자리부터 붙인다. `010-` 에서 지우면 다시 붙지 않아야 backspace 가 먹는다.
  if (digits.length <= 3) return digits

  const middleLength = digits.length > 10 ? 4 : 3
  const middle = digits.slice(3, 3 + middleLength)
  const last = digits.slice(3 + middleLength)

  return last ? `${digits.slice(0, 3)}-${middle}-${last}` : `${digits.slice(0, 3)}-${middle}`
}

/**
 * 포맷 뒤 커서가 있어야 할 자리를 구한다.
 *
 * 하이픈을 넣으면 글자 인덱스가 밀리지만 **커서 앞의 숫자 개수는 변하지 않는다.**
 * 그래서 인덱스가 아니라 숫자 개수를 기준으로 되찾는다.
 *
 * 이게 없으면 입력창 가운데를 고칠 때 커서가 맨 끝으로 튄다. 값 자체는 맞게 나오지만
 * 다음 한 글자가 엉뚱한 자리에 들어가서, 빠르게 치면 번호가 뒤섞인다.
 *
 * @param digitsBeforeCaret 포맷 전 값에서 커서 왼쪽에 있던 숫자 개수
 */
export function caretAfterDigits(formatted, digitsBeforeCaret) {
  if (digitsBeforeCaret <= 0) return 0

  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      seen += 1
      // 숫자를 다 셌으면 그 바로 뒤가 커서 자리다. 뒤따르는 하이픈은 건너뛰지 않는다 —
      // 건너뛰면 backspace 가 방금 친 숫자가 아니라 하이픈을 지운다.
      if (seen === digitsBeforeCaret) return index + 1
    }
  }
  return formatted.length
}
