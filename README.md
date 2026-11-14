# 큐떱대전

Q·W·E·R 중 한 명을 골라 CPU와 싸우는 1인용 대전 게임입니다. 상대와 스테이지는 주사위처럼 돌다가 랜덤으로 정해지고, 3판 2선승입니다.

빌드가 필요 없는 정적 사이트입니다. `index.html`과 `assets/` 폴더를 그대로 올리면 동작합니다.

## 파일 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 게임 전체(화면, 로직, 효과음 합성) |
| `assets/Q.webp` `W.webp` `E.webp` `R.webp` | 캐릭터 동작 스프라이트 |
| `assets/*_face.webp` | 캐릭터 얼굴 |
| `assets/bg_*.jpg` `th_*.jpg` | 스테이지 배경 4종(애니세상·체육관·도넛가게·밴드연습장)과 미리보기 |
| `assets/sp_*.mp4` | 필살기 영상 4편 |
| `.nojekyll` | GitHub Pages가 파일을 그대로 서빙하게 하는 빈 파일 |

## 배경음악

`assets/bgm.mp3`가 있으면 그 곡을 배경음악으로 반복 재생하고, 없으면 스테이지별 합성 음악이 나옵니다. 이 묶음에는 `bgm.mp3`가 들어 있지 않습니다. 구매한 음원은 공개 저장소에 올리지 말고, 혼자 쓸 때만 본인 기기에서 넣으세요.

## GitHub Pages 배포

1. `luckingx2` 계정에 저장소를 만든다(예: `qddup-fight`).
2. 이 폴더의 모든 파일을 저장소 루트에 올린다(`.nojekyll` 포함).
3. 저장소 Settings → Pages → Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 지정한다.
4. 1~2분 뒤 `https://luckingx2.github.io/qddup-fight/`에서 연다.

## 로컬 실행

파일을 더블클릭해서 열면 영상·이미지 로딩이 막힐 수 있으니 간이 서버로 엽니다.

```
python3 -m http.server 8000
```

그다음 `http://localhost:8000`.

## 조작

- 폰: 왼쪽 패드(좌우 이동, 위 점프, 아래 가드), P 펀치, K 킥, 필살(게이지 100%)
- PC: 방향키 + Z·X·C, 또는 WASD + J·K·L
- 필살기 영상은 공격 버튼이나 화면 탭으로 건너뜀
