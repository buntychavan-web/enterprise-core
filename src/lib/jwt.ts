/**
 * Client-side JWT payload decode — base64url decode only, NO signature
 * verification. This is a UI convenience (deriving which nav items/actions
 * to show) never a security boundary: every backend endpoint independently
 * re-validates the token and enforces @PreAuthorize on the actual request,
 * per AuthenticationService.collectAuthorities() / JwtAuthenticationFilter
 * on the server. If decoding fails or the token is malformed, callers get
 * `null` and should fail open to "no authorities" (hide, don't crash).
 */
export type DecodedJwtPayload = {
  sub?: string;
  authorities?: string[];
  exp?: number;
  iat?: number;
  [k: string]: unknown;
};

export function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as DecodedJwtPayload;
  } catch {
    return null;
  }
}
