import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ANSI Color Palette
 */
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

/**
 * Konfigurasi
 */
const CONFIG = {
  baseUrl: 'https://dyax.io',
  maxRetries: 3,
  retryDelayMs: 2000,
  delayBetweenAccountsMs: 1000,
  sessionsFile: 'sessions.json',
  commonHeaders: {
    accept: '*/*',
    'accept-language': 'en,en-US;q=0.9,id;q=0.8',
    origin: 'https://dyax.io',
    referer: 'https://dyax.io/en/profile',
    'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Baca sessions dari sessions.json
 */
function loadSessions() {
  const jsonPath = resolve(process.cwd(), CONFIG.sessionsFile);

  if (!existsSync(jsonPath)) {
    console.error(`${c.red}File ${CONFIG.sessionsFile} tidak ditemukan!${c.reset}`);
    console.error(`${c.gray}Buat file sessions.json berdasarkan sessions.example.json.${c.reset}\n`);
    return [];
  }

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error(`${c.red}File sessions.json kosong atau formatnya salah!${c.reset}\n`);
      return [];
    }

    return parsed.map((item, index) => ({
      name: item.name || `Akun #${index + 1}`,
      loginId: item.loginId || '',
      password: item.password || '',
      cookie: item.cookie || '',
    }));
  } catch (err) {
    console.error(`${c.red}Gagal membaca sessions.json: ${err.message}${c.reset}\n`);
    return [];
  }
}

/**
 * Simpan cookie baru ke sessions.json (setelah re-login berhasil)
 */
function saveCookie(sessionIndex, newCookie) {
  const jsonPath = resolve(process.cwd(), CONFIG.sessionsFile);
  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const sessions = JSON.parse(raw);
    if (sessions[sessionIndex]) {
      sessions[sessionIndex].cookie = newCookie;
      writeFileSync(jsonPath, JSON.stringify(sessions, null, 2), 'utf-8');
    }
  } catch {
    // Abaikan jika gagal menyimpan
  }
}

/**
 * Helper Fetch dengan Auto-Retry
 */
async function fetchWithRetry(url, options, maxRetries = CONFIG.maxRetries, retryDelay = CONFIG.retryDelayMs) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 80) || response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(retryDelay);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Panggil API Dyax (GET) - mengembalikan JSON
 */
async function callDyaxApi(endpoint, cookie) {
  const res = await fetchWithRetry(`${CONFIG.baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      ...CONFIG.commonHeaders,
      cookie: cookie,
    },
  });
  return await res.json();
}

/**
 * Login ulang menggunakan loginId + password
 * Mengembalikan cookie auth_sid baru jika berhasil, atau null jika gagal
 */
async function reLogin(session) {
  if (!session.loginId || !session.password) return null;

  try {
    const res = await fetchWithRetry(`${CONFIG.baseUrl}/api/auth/email/login`, {
      method: 'POST',
      headers: {
        ...CONFIG.commonHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        loginId: session.loginId,
        password: session.password,
        remember: 'true',
      }),
    });

    // Ambil Set-Cookie header untuk mendapatkan auth_sid baru
    const setCookieHeader = res.headers.get('set-cookie');

    if (setCookieHeader) {
      // Parse auth_sid dari Set-Cookie header
      const authSidMatch = setCookieHeader.match(/auth_sid=([^;]+)/);
      if (authSidMatch) {
        const newAuthSid = `auth_sid=${authSidMatch[1]}`;
        return newAuthSid;
      }
    }

    // Jika tidak ada Set-Cookie, coba ambil dari body response
    const body = await res.json().catch(() => null);
    if (body && body.error) {
      throw new Error(body.error);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cek status Daily Login dari riwayat terbaru (index 0)
 */
function checkDailyLoginStatus(recent = []) {
  if (!recent || recent.length === 0) {
    return { isToday: false, diffMinutes: 0, formattedDate: '-' };
  }

  const latest = recent.find((item) => item.reason === 'daily_login') || recent[0];
  const loginDate = new Date(latest.createdAt);
  const now = new Date();

  const isSameDayUTC = loginDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  const isSameDayLocal = loginDate.toDateString() === now.toDateString();
  const isToday = (isSameDayUTC || isSameDayLocal) && latest.reason === 'daily_login';

  const diffMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60));

  const tgl = loginDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
  const jam = loginDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = `${tgl} ${jam}`;

  return { isToday, diffMinutes, formattedDate };
}

/**
 * Proses satu akun: fetch data, jika gagal/expired coba re-login lalu retry
 */
async function processAccount(session, sessionIndex) {
  let activeCookie = session.cookie;
  let didReLogin = false;

  // Fungsi untuk fetch 3 endpoint utama
  const fetchAll = async (cookie) => {
    const userMe = await callDyaxApi('/api/users/me', cookie);
    const authUser = await callDyaxApi('/api/auth/user', cookie);
    const dyaxData = await callDyaxApi('/api/users/me/dyax', cookie);
    return { userMe, authUser, dyaxData };
  };

  let data;
  try {
    // Percobaan pertama dengan cookie yang ada
    data = await fetchAll(activeCookie);
  } catch {
    // Cookie mungkin expired, coba login ulang jika ada kredensial
    if (!session.loginId || !session.password) {
      throw new Error('Session expired (no credentials)');
    }

    const newCookie = await reLogin(session);

    if (newCookie) {
      activeCookie = newCookie;
      didReLogin = true;
      saveCookie(sessionIndex, newCookie);

      try {
        data = await fetchAll(activeCookie);
      } catch (retryErr) {
        throw new Error(`Re-login OK but fetch failed: ${retryErr.message}`);
      }
    } else {
      throw new Error('Session expired & re-login failed (wrong credentials?)');
    }
  }

  return { ...data, didReLogin };
}

/**
 * Main Execution
 */
async function main() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID');

  console.log(`\n${c.bold}DYAX DAILY AUTO CLAIM & CHECKER${c.reset}`);
  console.log(`${c.gray}${dateStr} • ${timeStr} WIB${c.reset}\n`);

  const sessions = loadSessions();

  if (sessions.length === 0) return;

  // Header kolom
  console.log(
    `  ${'#'.padEnd(3)} ${'AKUN'.padEnd(10)} ${'USERNAME'.padEnd(14)} ${'LV'.padEnd(5)} ${'POINTS'.padStart(8)}  ${'STATUS'.padEnd(14)} ${'CHECK-IN'}`
  );
  console.log(
    `  ${'─'.repeat(3)} ${'─'.repeat(10)} ${'─'.repeat(14)} ${'─'.repeat(5)} ${'─'.repeat(8)}  ${'─'.repeat(14)} ${'─'.repeat(14)}`
  );

  let successCount = 0;
  let failedCount = 0;
  let totalPoints = 0;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const noStr = String(i + 1).padStart(2, '0');
    const akunStr = session.name.slice(0, 10).padEnd(10);

    try {
      const { userMe, authUser, dyaxData, didReLogin } = await processAccount(session, i);

      const status = checkDailyLoginStatus(dyaxData.recent);
      const username = (userMe.name || authUser.user?.firstName || 'User').slice(0, 14).padEnd(14);
      const level = `Lv.${userMe.level ?? 1}`.padEnd(5);
      const rawPts = dyaxData.total ?? userMe.points ?? 0;
      const ptsFormatted = rawPts.toLocaleString('id-ID').padStart(8);

      let statusText;
      if (status.isToday) {
        statusText = status.diffMinutes < 5
          ? `${c.green}✓ Baru Klaim  ${c.reset}`
          : `${c.green}✓ Sudah Klaim ${c.reset}`;
      } else {
        statusText = `${c.yellow}! Belum Klaim ${c.reset}`;
      }

      const reLoginBadge = didReLogin ? ` ${c.yellow}↻ re-login${c.reset}` : '';

      console.log(
        `  ${c.dim}${noStr}${c.reset}  ${akunStr} ${c.bold}${username}${c.reset} ${c.dim}${level}${c.reset} ${c.cyan}${ptsFormatted}${c.reset}  ${statusText} ${c.gray}${status.formattedDate}${c.reset}${reLoginBadge}`
      );

      successCount++;
      totalPoints += rawPts;
    } catch (err) {
      const reason = err.message.includes('wrong credentials') ? 'creds salah' :
                     err.message.includes('no credentials') ? 'no creds' : 'expired';
      console.log(
        `  ${c.dim}${noStr}${c.reset}  ${akunStr} ${'-'.padEnd(14)} ${'-'.padEnd(5)} ${'─'.repeat(8)}  ${c.red}× Gagal/Exp   ${c.reset} ${c.gray}${reason}${c.reset}`
      );
      failedCount++;
    }

    if (i < sessions.length - 1) {
      await sleep(CONFIG.delayBetweenAccountsMs);
    }
  }

  // Footer
  console.log(
    `  ${'─'.repeat(3)} ${'─'.repeat(10)} ${'─'.repeat(14)} ${'─'.repeat(5)} ${'─'.repeat(8)}  ${'─'.repeat(14)} ${'─'.repeat(14)}`
  );
  console.log(
    `  Total: ${c.bold}${sessions.length}${c.reset} Akun  |  ${c.green}Sukses: ${successCount}${c.reset}  |  ${failedCount > 0 ? c.red : c.gray}Gagal: ${failedCount}${c.reset}  |  Total Poin: ${c.bold}${c.cyan}${totalPoints.toLocaleString('id-ID')}${c.reset}\n`
  );
}

main();
