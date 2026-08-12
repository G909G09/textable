# textable — 텍스트 자동 변환기

입력 중 특정 문자열을 자동으로 기호/문자로 변환해주는 크롬 확장 프로그램입니다.
웹의 모든 입력창(`input`, `textarea`)과 콘텐츠 편집 영역(`contenteditable`, 예: X/Twitter 작성창)에서 동작합니다.

## 기능

- **SYMBOLS 기호 변환**: `..`→`…`, `->`→`→`, `<-`→`←`, `--`→`—`
- **BRACKETS 괄호**: `=[`→`【`, `]=`→`】`, `.ㄱ`→`「`, `.ㄴ`→`」`, `<<`→`《`, `>>`→`》` (단축키 직접 수정 가능)
- **CALC 수식 계산**: `!수식!` 형태로 입력 후 닫는 `!`를 입력하면 계산 결과로 치환됩니다. 예) `!12*3!` → `36`
- **CUSTOM 커스텀 규칙**: 최대 30개의 나만의 변환 규칙 등록 (트리거 최대 12자, 치환 결과 최대 50자)
- 전체/카테고리/규칙 단위로 on-off 토글 가능
- 설정은 `chrome.storage.sync`에 저장되어 로그인된 크롬 계정 간 동기화됩니다

## 설치 (개발자 모드로 압축해제된 확장 프로그램 로드)

1. Chrome에서 `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭 후 이 저장소 폴더(`textable/`) 선택
4. 툴바의 확장 프로그램 아이콘을 클릭해 설정 팝업을 엽니다

## 폴더 구조

```
manifest.json           크롬 확장 프로그램 매니페스트 (Manifest V3)
background/background.js  최소 서비스 워커
content/content.js      입력 감지 및 자동 변환 엔진 (모든 페이지, 모든 프레임)
lib/defaults.js         기본 규칙/설정 스키마 및 정규화 로직 (content script·popup 공유)
lib/calc.js             `!수식!` 계산용 안전한 사칙연산 파서
popup/                  설정 팝업 UI (popup.html/css/js)
icons/                  확장 프로그램 아이콘
scripts/make_icons.py   아이콘 PNG 생성 스크립트
```

## 동작 원리

- `input`/`textarea`: 네이티브 value setter로 값을 갱신한 뒤 `input` 이벤트를 직접 발생시켜 React 등 프레임워크가 감지하는 값과 동기화합니다.
- `contenteditable`: 트리거 문자열을 Selection/Range로 선택한 뒤 `document.execCommand('insertText', …)`로 치환합니다. 이는 React/Draft.js 기반 편집기(X/Twitter 등)와의 호환성을 위한 방식입니다.
- 수식 계산은 `eval`/`Function`을 사용하지 않는 자체 사칙연산 파서(`lib/calc.js`)로 안전하게 처리합니다.
