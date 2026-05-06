---
name: 개발 환경 교훈 모음
type: feedback
---

## Android 에뮬레이터 ADB 규칙

**ADB 좌표는 UIAutomator로 구한다**
`adb shell uiautomator dump` 로 실제 bounds 확인 후 center 좌표 사용.
눈대중 좌표(adb input tap 540 858 등)는 번번이 빗나간다.

**Tailscale VPN이 켜져 있으면 에뮬레이터 인터넷 차단**
Tailscale 활성화 시 QEMU SLIRP 네트워크 외부 트래픽 차단 → Firebase 전부 실패.
에뮬레이터 테스트 전 Tailscale 비활성화 먼저 확인.

**QEMU 아웃바운드 방화벽 허용 필요 (Windows)**
qemu-system-x86_64.exe 아웃바운드 방화벽 허용 규칙 1회 등록 필요.

**ADB 포트 포워딩은 앱 재시작마다 재설정**
앱 재시작 후 반드시: `adb reverse tcp:8081 tcp:8081`

**Firebase Auth auth/invalid-credential**
최신 SDK는 auth/wrong-password 대신 auth/invalid-credential 반환.
LoginScreen switch 문에 이 케이스 추가 필수.

---

## React Native Android 파일 업로드 규칙

**content:// URI → RNBlobUtil.fs.cp + ref.putFile 조합만 작동**
```typescript
const tmpPath = `${RNBlobUtil.fs.dirs.CacheDir}/upload_${Date.now()}.${ext}`;
await RNBlobUtil.fs.cp(uri, tmpPath);
const task = ref.putFile(`file://${tmpPath}`);
await task;
RNBlobUtil.fs.unlink(tmpPath).catch(() => {});
```

**절대 금지 방법:**
- ref.put(blob) → 앱 크래시
- FileReader → Hermes 프로덕션에서 크래시
- DocumentPicker copyTo 옵션 → fileCopyUri가 null
