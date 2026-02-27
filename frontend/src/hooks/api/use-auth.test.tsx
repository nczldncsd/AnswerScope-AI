import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readSessionIdentity } from "@/lib/auth/session-store";
import { useRegisterMutation } from "@/hooks/api/use-auth";

function makeJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": "rid-test",
    },
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "QueryClientTestWrapper";
  return Wrapper;
}

describe("useRegisterMutation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("posts register with credentials and stores /api/me identity", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        makeJsonResponse({
          success: true,
          user_id: 99,
          message: "User registered successfully",
        })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          success: true,
          user_id: 99,
          email: "qa@example.com",
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useRegisterMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "qa@example.com",
        password: "Password123",
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/register");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });

    expect(readSessionIdentity()).toEqual({
      userId: 99,
      email: "qa@example.com",
    });
  });
});
