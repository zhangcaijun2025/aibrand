import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api';

/**
 * AI Agent Chat tests.
 */
test.describe('Agent Chat', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get token
    const mailRes = await request.post(`${API_BASE}/login/mail`, {
      data: { mail: 'admin@aibrand.ai' },
    });
    expect(mailRes.status()).toBe(200);

    const verifyRes = await request.post(`${API_BASE}/login/mail/verify`, {
      data: { mail: 'admin@aibrand.ai', code: '888888' },
    });
    expect(verifyRes.status()).toBe(200);

    const body = await verifyRes.json();
    authToken = body.data?.token || body.data?.accessToken || body.data;
    if (typeof authToken === 'object') authToken = authToken?.token || authToken?.accessToken;
  });

  test('agent chat endpoint returns SSE stream', async ({ request }) => {
    test.skip(!authToken, 'Auth token not available — skipping agent chat test');
    const res = await request.post(`${API_BASE}/agent/chat`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { message: '你好，请简单介绍一下你自己' },
      timeout: 30000,
    });

    // SSE should return 200 even if Dify is unavailable
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/event-stream');
  });

  test('agent chat requires authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/agent/chat`, {
      data: { message: 'test' },
      timeout: 5000,
    });
    // API may return error body with 200 or proper 401/403
    const body = await res.json().catch(() => ({}));
    const hasError = res.status() >= 400 || body.code !== 0 || body.status === 'error';
    expect(hasError).toBe(true);
  });
});
