# Capacitor 앱 빌드 가이드

이 프로젝트는 Next.js 웹 앱과 Capacitor 네이티브 앱을 하나의 코드베이스에서 빌드합니다.

## 아키텍처

- **웹 빌드** (`npm run build`): 일반 Next.js 서버 빌드. API 라우트가 같이 배포됨. Vercel 등에 배포.
- **앱 빌드** (`npm run app:build`): `BUILD_TARGET=app`으로 정적 export (`out/`). API 라우트는 빌드 시 임시로 숨겨짐. 앱은 `NEXT_PUBLIC_API_BASE`가 가리키는 원격 웹 배포의 API를 호출.

## 최초 설치 (한 번만)

```bash
# 남아있는 패키지 설치 (네트워크 이슈로 실패했다면 재시도)
npm install -D @capacitor/cli@8 cross-env

# Android 플랫폼 추가 (android/ 폴더 생성)
npm run app:add:android
```

## 개발 흐름

### 1. `.env.local` 준비 (앱 빌드용)

앱은 원격 API를 호출하므로 웹 버전이 배포된 URL 필요:

```
# .env.local
NEXT_PUBLIC_API_BASE=https://your-deployed-host.vercel.app
```

웹 빌드에선 이 변수가 비어 있어도 됨 (상대 경로 `/api/...` 사용).

### 2. 앱 빌드 + 동기화

```bash
# 정적 export → capacitor sync android
npm run app:sync
```

내부적으로:
1. `scripts/app-build-guard.js hide` — `app/api/`를 `.app-api.stash/`로 옮김
2. `BUILD_TARGET=app next build` — `out/`에 정적 파일 생성
3. `scripts/app-build-guard.js restore` — API 폴더 원복
4. `npx cap sync android` — `out/` → `android/app/src/main/assets/public/` 복사

### 3. Android Studio에서 실행

```bash
npm run app:open
# → Android Studio 열림. 에뮬레이터/실기기 선택해 Run.
```

## 자주 겪는 문제

- **빌드 도중 종료로 `app/api/`가 사라짐** → `.app-api.stash/`가 있으면 폴더명만 `app/api/`로 되돌리면 됨. 또는 `node scripts/app-build-guard.js restore` 실행.
- **앱에서 API 호출 실패** → `.env.local`의 `NEXT_PUBLIC_API_BASE`가 유효한 https URL인지 확인. CORS는 웹 배포의 Next.js Route Handlers가 자동 허용.
- **정적 export 실패** → Route Handlers가 `app/api/` 밖에 있으면 hide 스크립트가 못 잡음. 새 API 라우트는 `app/api/` 아래에만 두기.

## iOS 추가

Mac + Xcode 필요:

```bash
npm run app:add:ios
npx cap sync ios
npx cap open ios
```

`capacitor.config.ts`의 `webDir`는 그대로 `out`이면 됨.
