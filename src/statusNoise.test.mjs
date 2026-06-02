import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const setStatusLines = appSource
  .split("\n")
  .filter((line) => line.includes("setStatus"));

test("quiet edit actions clear ordinary status instead of opening bottom popups", () => {
  const quietEditFragments = [
    "되돌렸습니다",
    "다시 실행했습니다",
    "순서를 변경했습니다",
    "조정했습니다",
    "이동 keyframe 위치를 조정했습니다",
    "파트너가 연결되었습니다",
    "교체했습니다",
    "페어를 해제하고 토큰을 이동했습니다",
    "파트너 연결을 해제했습니다",
    "대형을 선택했습니다",
    "대형 지점을 추가했습니다",
    "를 추가했습니다",
    "템플릿을 미리 봅니다",
    "개인 템플릿으로 저장했습니다",
    "AI 후보를 안전 검증했습니다",
    "배치를 적용했습니다",
    "대형을 추가했습니다",
    "기본 배치로 초기화했습니다",
    "명을 선택했습니다"
  ];

  for (const fragment of quietEditFragments) {
    assert.equal(
      setStatusLines.some((line) => line.includes(fragment)),
      false,
      `unexpected noisy edit status: ${fragment}`
    );
  }
});

test("quiet status clearing does not dismiss recovery popups", () => {
  const helper = appSource.match(/function clearQuietStatus\(\) \{[\s\S]*?\n  \}/)?.[0] || "";

  assert.match(helper, /if \(!statusRecovery\)/);
  assert.match(helper, /setStatus\(""\)/);
});

test("important bottom status messages stay available", () => {
  const importantFragments = [
    "Supabase 저장 실패",
    "음악을 선택했습니다. 서버에 업로드하는 중",
    "음악 저장됨",
    "재생을 시작할 수 없습니다",
    "클라우드에 저장하는 중",
    "클라우드에 저장됨",
    "View Link와 Edit Link를 만드는 중",
    "View Link와 Edit Link가 생성되었습니다",
    "공유 링크를 복사했습니다",
    "공유 링크 복사 실패",
    "편집 링크를 복사했습니다",
    "편집 링크 복사 실패",
    "무대 크기 변경을 막았습니다",
    "마지막 대형은 삭제할 수 없습니다",
    "올바른 Movemap 프로젝트 파일이 아닙니다"
  ];

  for (const fragment of importantFragments) {
    assert.equal(
      setStatusLines.some((line) => line.includes(fragment)),
      true,
      `missing important status: ${fragment}`
    );
  }
});

test("bottom status popup includes a dismiss button", () => {
  const statusRender = appSource.match(/\{status && \([\s\S]*?\n      \)\}/)?.[0] || "";

  assert.match(statusRender, /aria-label="상태 알림 닫기"/);
  assert.match(statusRender, /onClick=\{dismissStatus\}/);
});
