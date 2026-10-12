// Closed allowlist: queries, hashes, encoded separators and protocol-relative
// paths cannot turn an authentication redirect into an external navigation.
const destinations = new Set(["/", "/recipes", "/me", "/settings", "/settings/profile", "/reset-password"]);

export function safeNextPath(input: unknown, fallback = "/me") {
  return typeof input === "string" && destinations.has(input) ? input : fallback;
}
