import { readFileSync, existsSync } from 'node:fs';
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
  commonHeaders: {
    accept: '*/*',
    'accept-language': 'en,en-US;q=0.9,id;q=0.8',
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
 * Helper Fetch dengan Auto-Retry
 */
async function fetchWithRetry(url, options, maxRetries = CONFIG.maxRetries, retryDelay = CONFIG.retryDelayMs) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 50) || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(retryDelay);
      } else {
        throw error;
      }
    }
  }
}

async function callDyaxApi(endpoint, cookie) {
  return await fetchWithRetry(`${CONFIG.baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      ...CONFIG.commonHeaders,
      cookie: cookie,
    },
  });
}

/**
 * Cek status Daily Login
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
 * Baca sessions dari sessions.txt
 */
function loadSessions() {
  const txtPath = resolve(process.cwd(), 'sessions.txt');

  if (existsSync(txtPath)) {
    try {
      const content = readFileSync(txtPath, 'utf-8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      if (lines.length > 0) {
        return lines.map((line, index) => {
          if (line.includes('|')) {
            const [name, ...cookieParts] = line.split('|');
            return {
              name: name.trim() || `Akun #${index + 1}`,
              cookie: cookieParts.join('|').trim(),
            };
          }
          return {
            name: `Akun #${index + 1}`,
            cookie: line,
          };
        });
      }
    } catch (err) {
      console.error(`Gagal membaca sessions.txt: ${err.message}`);
    }
  }

  return [];
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

  if (sessions.length === 0) {
    console.log(`${c.red}File sessions.txt kosong atau belum diisi!${c.reset}\n`);
    return;
  }

  // Header Kolom (Tanpa box-drawing yang mudah pecah/berantakan)
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
      const userMe = await callDyaxApi('/api/users/me', session.cookie);
      const authUser = await callDyaxApi('/api/auth/user', session.cookie);
      const dyaxData = await callDyaxApi('/api/users/me/dyax', session.cookie);

      const status = checkDailyLoginStatus(dyaxData.recent);
      const username = (userMe.name || authUser.user?.firstName || 'User').slice(0, 14).padEnd(14);
      const level = `Lv.${userMe.level ?? 1}`.padEnd(5);
      const rawPts = dyaxData.total ?? userMe.points ?? 0;
      const ptsFormatted = rawPts.toLocaleString('id-ID').padStart(8);

      let statusText = '';
      if (status.isToday) {
        statusText = status.diffMinutes < 5
          ? `${c.green}✓ Baru Klaim  ${c.reset}`
          : `${c.green}✓ Sudah Klaim ${c.reset}`;
      } else {
        statusText = `${c.yellow}! Belum Klaim ${c.reset}`;
      }

      console.log(
        `  ${c.dim}${noStr}${c.reset}  ${akunStr} ${c.bold}${username}${c.reset} ${c.dim}${level}${c.reset} ${c.cyan}${ptsFormatted}${c.reset}  ${statusText} ${c.gray}${status.formattedDate}${c.reset}`
      );

      successCount++;
      totalPoints += rawPts;
    } catch (err) {
      console.log(
        `  ${c.dim}${noStr}${c.reset}  ${akunStr} ${'-'.padEnd(14)} ${'-'.padEnd(5)} ${'-'.padStart(8)}  ${c.red}× Gagal/Exp   ${c.reset} ${c.gray}-${c.reset}`
      );
      failedCount++;
    }

    if (i < sessions.length - 1) {
      await sleep(CONFIG.delayBetweenAccountsMs);
    }
  }

  console.log(
    `  ${'─'.repeat(3)} ${'─'.repeat(10)} ${'─'.repeat(14)} ${'─'.repeat(5)} ${'─'.repeat(8)}  ${'─'.repeat(14)} ${'─'.repeat(14)}`
  );
  console.log(
    `  Total: ${c.bold}${sessions.length}${c.reset} Akun  |  ${c.green}Sukses: ${successCount}${c.reset}  |  ${failedCount > 0 ? c.red : c.gray}Gagal: ${failedCount}${c.reset}  |  Total Poin: ${c.bold}${c.cyan}${totalPoints.toLocaleString('id-ID')}${c.reset}\n`
  );
}

main();
