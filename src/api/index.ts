/** Compatible with the public Rip-Hunter /graphql binding; transport owns deadlines and errors. */
export interface ApiOperation {
  readonly operationName: string;
  readonly query: string;
  readonly variables?: Record<string, unknown>;
}
export interface ApiRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeout?: number;
  readonly token?: string;
}
export type GraphqlBinding = <T>(endpoint: string, operation: ApiOperation, options?: ApiRequestOptions) => Promise<T>;
export interface NativeApi {
  request<T>(operation: ApiOperation, options: ApiRequestOptions & {readonly authenticated: boolean}): Promise<T>;
}
export const createNativeApi = ({endpoint, request, preflight, timeout}: {
  readonly endpoint: string;
  readonly request: GraphqlBinding;
  readonly preflight?: () => Promise<string>;
  readonly timeout: number;
}): NativeApi => {
  const url = new URL(endpoint);
  if(url.protocol !== 'https:' || url.username || url.password || url.hash ||
    !Number.isFinite(timeout) || timeout < 0) {
    throw new Error('Invalid hosted API configuration');
  }
  return {
    request: async <T>(
      operation: ApiOperation, options: ApiRequestOptions & {readonly authenticated: boolean}
    ): Promise<T> => {
      const token = options.authenticated ? await preflight?.() : options.token;
      if(options.authenticated && !token) {
        throw new Error('Authenticated API requires a current credential');
      }
      return request<T>(endpoint, operation, {
        ...(options.signal ? {signal: options.signal} : {}),
        timeout: options.timeout ?? timeout,
        ...(token ? {token} : {})
      });
    }
  };
};
