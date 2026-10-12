// Closed allowlist: queries, hashes, encoded separators and protocol-relative
// paths cannot turn an authentication redirect into an external navigation.
const destinations = new Set(["/", "/recipes", "/recipes/new", "/me", "/notifications", "/settings", "/settings/profile", "/reset-password"]);

export function safeNextPath(input: unknown, fallback = "/me") {
  return typeof input === "string" && (destinations.has(input)
    || /^\/recipes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/edit)?$/.test(input)) ? input : fallback;
}
