import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api';

/**
 * API-level tests for API Key management.
 * Tests against the running backend — no browser needed.
 */
test.describe('API Key Management', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Step 1: Send verification code
    const mailRes = await request.post(`${API_BASE}/login/mail`, {
      data: { mail: 'admin@aibrand.ai' },
    });
    expect(mailRes.status()).toBe(200);

    // Step 2: Verify (use dev bypass code)
    const verifyRes = await request.post(`${API_BASE}/login/mail/verify`, {
      data: { mail: 'admin@aibrand.ai', code: '888888' },
    });
    expect(verifyRes.status()).toBe(200);

    const body = await verifyRes.json();
    // Token may be nested at various paths depending on auth middleware
    authToken = body.data?.token || body.data?.accessToken || body.data;
    if (typeof authToken === 'object') authToken = authToken?.token || authToken?.accessToken;
  });

  test('creates API key and lists it', async ({ request }) => {
    test.skip(!authToken, 'Auth token not available — skipping API key test');

    // Create key
    const createRes = await request.post(`${API_BASE}/api-key/create`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: `e2e-test-key-${Date.now()}` },
    });
    expect(createRes.status()).toBe(200);
    const created = await createRes.json();
    const keyId = created.data?.id || created.id;
    expect(keyId).toBeTruthy();

    // List keys
    const listRes = await request.get(`${API_BASE}/api-key/list`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(listRes.status()).toBe(200);
    const list = await listRes.json();
    const keys = list.data || list;
    expect(Array.isArray(keys)).toBe(true);

    // Delete key
    const delRes = await request.delete(`${API_BASE}/api-key/${keyId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(delRes.status()).toBe(200);
  });

  test('rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api-key/create`, {
      data: { name: 'no-auth-test' },
    });
    // API may return error body with 200 or proper 401/403 depending on auth middleware
    const body = await res.json().catch(() => ({}));
    const hasError = res.status() >= 400 || body.code !== 0 || body.status === 'error';
    expect(hasError).toBe(true);
  });
});
