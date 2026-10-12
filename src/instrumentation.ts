export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("./lib/env/server");
    const { getPublicEnv } = await import("./lib/env/public");
    getServerEnv();
    getPublicEnv();
  }
}
