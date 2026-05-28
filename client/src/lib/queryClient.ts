import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrConfig: string | { url: string; method?: string; headers?: HeadersInit; data?: unknown },
  options?: { method?: string; headers?: HeadersInit; data?: unknown }
): Promise<Response> {
  let url: string;
  let method: string = 'GET';
  let headers: HeadersInit = {};
  let data: unknown | undefined;
  
  // Handle overloaded function signature
  if (typeof urlOrConfig === 'string') {
    url = urlOrConfig;
    if (options) {
      method = options.method || 'GET';
      headers = options.headers || {};
      data = options.data;
    }
  } else {
    url = urlOrConfig.url;
    method = urlOrConfig.method || 'GET';
    headers = urlOrConfig.headers || {};
    data = urlOrConfig.data;
  }
  
  // Add content-type header if we have data
  if (data) {
    headers = { ...headers, 'Content-Type': 'application/json' };
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
