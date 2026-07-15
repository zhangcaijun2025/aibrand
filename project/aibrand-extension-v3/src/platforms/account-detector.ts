/**
 * AiBrand Extension v3 — Browser Session Account Detector
 *
 * No OAuth. No redirects. No developer app registration.
 *
 * The user is ALREADY logged into these platforms in Chrome.
 * We just detect who they are by calling each platform's internal API
 * with credentials: "include" (browser cookies).
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface DetectedAccount {
  platform: string;
  accountId: string;
  username: string;
  avatarUrl?: string;
  profileUrl?: string;
  loggedIn: boolean;
  error?: string;
}

interface PlatformDetector {
  platform: string;
  name: string;
  /** The API endpoint to call (with browser cookies) */
  checkUrl: string;
  /** Parse the response into DetectedAccount */
  parse: (data: unknown) => DetectedAccount | null;
  /** Optional: DOM-based fallback check */
  domCheck?: () => Promise<boolean>;
}

// ─── Platform Detectors ───────────────────────────────────────────────────

const DETECTORS: PlatformDetector[] = [
  {
    platform: 'douyin',
    name: '抖音',
    checkUrl: 'https://creator.douyin.com/web/api/media/user/info/',
    parse: (data: unknown) => {
      const d = data as { user?: { sec_uid: string; nickname: string; avatar_larger?: { url_list?: string[] } } };
      if (!d?.user) return null;
      return {
        platform: 'douyin',
        accountId: d.user.sec_uid,
        username: d.user.nickname,
        avatarUrl: d.user.avatar_larger?.url_list?.[0],
        profileUrl: `https://www.douyin.com/user/${d.user.sec_uid}`,
        loggedIn: true,
      };
    },
  },
  {
    platform: 'bilibili',
    name: 'B站',
    checkUrl: 'https://api.bilibili.com/x/web-interface/nav',
    parse: (data: unknown) => {
      const d = data as { data?: { isLogin?: boolean; mid?: number | string; uname: string; face?: string } };
      if (!d?.data?.isLogin) return null;
      return {
        platform: 'bilibili',
        accountId: String(d.data.mid),
        username: d.data.uname,
        avatarUrl: d.data.face,
        profileUrl: `https://space.bilibili.com/${d.data.mid}`,
        loggedIn: true,
      };
    },
  },
  {
    platform: 'weibo',
    name: '微博',
    checkUrl: 'https://weibo.com/ajax/profile/info',
    parse: (data: unknown) => {
      const d = data as { data?: { user?: { id: number | string; screen_name: string; name: string; avatar_hd?: string; profile_image_url?: string } } };
      if (!d?.data?.user) return null;
      const u = d.data.user;
      return {
        platform: 'weibo',
        accountId: String(u.id),
        username: u.screen_name || u.name,
        avatarUrl: u.avatar_hd || u.profile_image_url,
        profileUrl: `https://weibo.com/u/${u.id}`,
        loggedIn: true,
      };
    },
  },
  {
    platform: 'zhihu',
    name: '知乎',
    checkUrl: 'https://www.zhihu.com/api/v4/me',
    parse: (data: unknown) => {
      const d = data as { id?: string; name: string; avatar_url?: string; url_token?: string };
      if (!d?.id) return null;
      return {
        platform: 'zhihu',
        accountId: d.id,
        username: d.name,
        avatarUrl: d.avatar_url,
        profileUrl: `https://www.zhihu.com/people/${d.url_token || d.id}`,
        loggedIn: true,
      };
    },
  },
  {
    platform: 'xhs',
    name: '小红书',
    checkUrl: 'https://creator.xiaohongshu.com/web/api/media/user/info/',
    parse: (data: unknown) => {
      const d = data as { data?: { user?: { id: string; nickname: string; name: string; avatar?: string } } };
      if (!d?.data?.user) return null;
      const u = d.data.user;
      return {
        platform: 'xhs',
        accountId: u.id,
        username: u.nickname || u.name,
        avatarUrl: u.avatar,
        loggedIn: true,
      };
    },
  },
  {
    platform: 'toutiao',
    name: '头条号',
    checkUrl: 'https://mp.toutiao.com/tool/api/user/info/',
    parse: (data: unknown) => {
      const d = data as { data?: { user_id?: number | string; name?: string } };
      if (!d?.data?.user_id) return null;
      return {
        platform: 'toutiao',
        accountId: String(d.data.user_id),
        username: d.data.name || '头条用户',
        loggedIn: true,
      };
    },
  },
  {
    platform: 'kuaishou',
    name: '快手',
    checkUrl: 'https://cp.kuaishou.com/rest/app/user/current',
    parse: (data: unknown) => {
      const d = data as { data?: { userId?: number | string; userName?: string; nickName?: string } };
      if (!d?.data?.userId) return null;
      return {
        platform: 'kuaishou',
        accountId: String(d.data.userId),
        username: d.data.userName || d.data.nickName || '快手用户',
        loggedIn: true,
      };
    },
  },
];

// ─── Detector ─────────────────────────────────────────────────────────────

export class AccountDetector {
  /**
   * Scan all platforms for logged-in accounts.
   * Makes parallel fetch() calls with browser cookies.
   */
  async scanAll(): Promise<DetectedAccount[]> {
    const results = await Promise.allSettled(
      DETECTORS.map((d) => this.detectOne(d)),
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        platform: DETECTORS[i].platform,
        accountId: '',
        username: '',
        loggedIn: false,
        error: r.status === 'rejected' ? String(r.reason) : 'Unknown',
      } as DetectedAccount;
    });
  }

  /**
   * Scan a single platform.
   */
  async scanOne(platformId: string): Promise<DetectedAccount> {
    const detector = DETECTORS.find((d) => d.platform === platformId);
    if (!detector) {
      return { platform: platformId, accountId: '', username: '', loggedIn: false, error: 'Unknown platform' };
    }
    return this.detectOne(detector);
  }

  private async detectOne(detector: PlatformDetector): Promise<DetectedAccount> {
    try {
      const res = await fetch(detector.checkUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        return { platform: detector.platform, accountId: '', username: '', loggedIn: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const account = detector.parse(data);

      if (account) {
        console.log(`[AccountDetector] ${detector.platform}: logged in as ${account.username}`);
        return account;
      }

      return { platform: detector.platform, accountId: '', username: '', loggedIn: false, error: 'Not logged in' };
    } catch (err) {
      return {
        platform: detector.platform, accountId: '', username: '', loggedIn: false,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: AccountDetector | null = null;
export function getAccountDetector(): AccountDetector {
  if (!instance) instance = new AccountDetector();
  return instance;
}
