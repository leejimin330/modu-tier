# 티어잇 — 설계

## 목적
여러 사용자가 같은 주제(예: "주술회전 강함 순위", "매력도 순위")에 각자 티어를 매기면,
그 표를 모아 **종합 티어**를 자동으로 산출해 보여주는 사이트. 수익은 광고만.

## 결정 사항
| 항목 | 결정 |
|---|---|
| 주제 생성 | V1은 운영자만. 이후 사용자 개방 (신고 → 관리자 확인 → 삭제) |
| 로그인 | 보기·티어 체험은 누구나. 종합 티어 반영은 로그인 사용자 표만 (1인 1표, 수정 가능) |
| 집계 | 베이지안 평균: `(Σ점수 + m·C) / (n + m)`, m=3, C=주제 전체 평균(표 없으면 3) |
| 점수 | S=5 A=4 B=3 C=2 D=1. 종합 티어 컷: S≥4.5, A≥3.5, B≥2.5, C≥1.5, 그 외 D |
| 이미지 | AniList GraphQL로 작품 검색 → 캐릭터 가져오기, 이미지 URL은 AniList 것을 그대로 표시 + 출처 링크. 없으면 직접 업로드 |
| 저작권 | 모든 페이지 하단에 출처·권리 고지, 캐릭터/주제 신고로 권리자 삭제 요청 처리 |
| 스택 | Next.js 16 + Supabase(Auth·Postgres·Storage) + Vercel. Supabase 미설정 시 로컬 개발 모드(개발용 로그인 + `.data/dev-db.json`) |

AniList 약관: 월 매출 $150 미만은 상업 이용 무료, 대량 수집 금지, 사이트 이름에 "AniList" 사용 금지.

## 데이터
- `users(id, provider, label)`
- `topics(id, slug, title, description, category, status[active|hidden], created_by, created_at)`
- `characters(id, name, series, image_url, source[anilist|upload], anilist_id unique, source_url)` — 주제 간 공유
- `topic_items(topic_id, character_id, added_at)` — 주제에 속한 캐릭터
- `votes(topic_id, user_id, character_id, tier)` PK(topic_id, user_id, character_id). 저장은 사용자·주제 단위로 통째로 교체
- `reports(id, target_type[topic|item], topic_id, character_id?, reason, user_id?, status[open|resolved|dismissed], created_at)`

## 화면
- `/` 주제 목록 (분류별, 참여자 수, 미리보기 이미지)
- `/t/[slug]` 종합 티어 보드. 캐릭터를 누르면 평균·표 수·득표 분포·출처·신고
- `/t/[slug]/rank` 내 티어 매기기 (드래그 또는 탭→티어 선택). 비로그인은 브라우저에 임시 저장, 로그인 후 불러와 제출
- `/login` 카카오·구글 (개발 모드는 개발용 로그인)
- `/admin` 주제 생성·숨김, `/admin/topics/[id]` AniList 검색·가져오기, 직접 추가, 이름 수정, 제거
- `/admin/reports` 신고 목록 → 삭제(주제 숨김 / 캐릭터 제거) 또는 기각

## 권한
관리자 = `ADMIN_USER_IDS` 환경변수의 사용자 id (개발 모드에서는 개발용 계정). 모든 Server Action에서 인증·권한 확인.
DB 접근은 서버(secret key)에서만, 클라이언트 직접 접근은 RLS로 차단.

## 테스트
집계(`aggregate`)와 입력 검증은 단위 테스트(vitest). 화면은 로컬 개발 모드로 실제 띄워 확인.
