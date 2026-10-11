import {parseStrictJwtTimeHints} from '../session/sessionPolicy.js';

export interface NativeCredentialEnvelope {
  readonly schemaVersion: 1;
  readonly environment: string;
  readonly userId: string;
  readonly token: string;
  readonly issued: number;
  readonly expires: number;
  readonly sid: string;
  readonly username: string;
}
const fields = ['schemaVersion', 'environment', 'userId', 'token', 'issued', 'expires', 'sid', 'username'];
const bounded = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/u.test(value);
/** JWT decoding is only an untrusted time hint, never signature verification. */
export const parseCredentialEnvelope = (
  value: unknown, environment: string, now: number
): NativeCredentialEnvelope | undefined => {
  if(!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const data = value as Record<string, unknown>;
  if(Object.keys(data).length !== fields.length || !fields.every((field) => Object.hasOwn(data, field)) ||
    data['schemaVersion'] !== 1 || data['environment'] !== environment || !bounded(data['environment'], 128) ||
    !bounded(data['userId'], 256) || !bounded(data['username'], 256) || !bounded(data['sid'], 256) || !bounded(data['token'], 16384) ||
    typeof data['issued'] !== 'number' || typeof data['expires'] !== 'number' ||
    !Number.isSafeInteger(data['issued']) || !Number.isSafeInteger(data['expires'])) {
    return undefined;
  }
  const {token, issued, expires} = data;
  const hint = parseStrictJwtTimeHints(token);
  if(!hint) {
    return undefined;
  }
  const {expires: jwtExpires, issued: jwtIssued} = hint;
  if(!jwtIssued || !jwtExpires || Math.abs(issued - jwtIssued) >= 1000 || Math.abs(expires - jwtExpires) >= 1000 ||
    Math.max(issued, jwtIssued) > now + 30000 || expires <= issued || jwtExpires <= jwtIssued ||
    expires - issued > 900000 || jwtExpires - jwtIssued > 900000 ||
    Math.min(expires, jwtExpires) <= now) {
    return undefined;
  }
  return {
    environment, expires: Math.min(expires, jwtExpires), issued: Math.max(issued, jwtIssued),
    schemaVersion: 1, sid: data['sid'], token, userId: data['userId'], username: data['username']
  };
};
