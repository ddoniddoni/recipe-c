import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Project CLI only. Avoid global telemetry changes and network reporting.
const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1" },
});
child.on("error", () => {
  process.stderr.write("Supabase CLI를 시작하지 못했습니다. npm install을 먼저 실행하세요.\n");
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
