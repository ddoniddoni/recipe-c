import { spawnSync } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
// The default remains local. Remote generation is an explicit --linked choice.
if (args.some((arg) => arg !== "--linked" && arg !== "--local") || args.length > 1) {
  throw new Error("Usage: npm run db:types -- [--local|--linked]");
}
const target = args[0] ?? "--local";
const result = spawnSync(process.execPath, [
  resolve(root, "node_modules/supabase/dist/supabase.js"),
  "gen", "types", "typescript", target, "--schema", "public",
], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1" },
});
if (result.status !== 0 || !result.stdout?.includes("export type Database")) {
  // Preserve the existing file; do not echo CLI output that might contain credentials.
  throw new Error("DB 타입 생성 실패: 기존 타입 파일을 보존했습니다. 연결과 migration 적용 상태를 확인하세요.");
}
const destination = resolve(root, "src/lib/supabase/database.ts");
await mkdir(dirname(destination), { recursive: true });
const temporary = `${destination}.${process.pid}.tmp`;
await writeFile(temporary, result.stdout, "utf8");
await rename(temporary, destination);
process.stdout.write("Supabase DB 타입을 갱신했습니다.\n");
