// Royal Typewriter Mathematical Monospace & Telegram VIP Formatter for Al-Areen Al-Dahabi

/**
 * Converts ASCII alphanumeric characters to Mathematical Monospace Unicode glyphs.
 * Example: "15:30 USDDZD-OTC - BUY" -> "𝟷𝟻:𝟹𝟶 𝚄𝚂𝙳𝙳𝚉𝙳-𝙾𝚃𝙲 - 𝙱𝚄𝚈"
 */
export function toTypewriterMono(str: string): string {
  return str
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Digits 0-9: 0x30 to 0x39 -> U+1D7F6 to U+1D7FF (𝟶-𝟿)
      if (code >= 0x30 && code <= 0x39) {
        return String.fromCodePoint(0x1d7f6 + (code - 0x30));
      }
      // Uppercase A-Z: 0x41 to 0x5A -> U+1D670 to U+1D689 (𝙰-𝚉)
      if (code >= 0x41 && code <= 0x5A) {
        return String.fromCodePoint(0x1d670 + (code - 0x41));
      }
      // Lowercase a-z: 0x61 to 0x7A -> U+1D68A to U+1D6A3 (𝚊-𝚣)
      if (code >= 0x61 && code <= 0x7A) {
        return String.fromCodePoint(0x1d68a + (code - 0x61));
      }
      return char;
    })
    .join('');
}

/**
 * Returns formatted local UTC string in typewriter monospace, e.g. "🔹 𝚄𝚃𝙲 ( +𝟶𝟹:𝟶𝟶 ) 🔻"
 */
export function formatUtcHeaderMono(offsetStr?: string): string {
  let offset = offsetStr;
  if (!offset) {
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    const mins = Math.abs(offsetMin) % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    offset = `${sign}${pad(hours)}:${pad(mins)}`;
  }
  // If offset is simple "+03:00"
  return `🔹 ${toTypewriterMono(`UTC ( ${offset} )`)} 🔻`;
}

export interface FormattableSignal {
  timeStr: string;
  pair: string;
  direction: 'CALL' | 'PUT' | 'BUY' | 'SELL' | string;
}

/**
 * Formats a single signal line into the exact typewriter format requested:
 * "❒ 𝟷𝟻:𝟹𝟶 𝚄𝚂𝙳𝙳𝚉𝙳-𝙾𝚃𝙲 - 𝙱𝚄𝚈"
 */
export function formatSingleSignalMono(sig: FormattableSignal): string {
  const cleanPair = sig.pair
    .replace('/', '')
    .replace(' OTC', '-OTC')
    .trim();

  // Normalize pair name to have "-OTC"
  const pairName = cleanPair.includes('-OTC') ? cleanPair : `${cleanPair}-OTC`;

  // Normalize direction to BUY / PUT
  const dirText = sig.direction === 'CALL' || sig.direction === 'BUY' ? 'BUY' : 'PUT';

  const rawLine = `${sig.timeStr} ${pairName} - ${dirText}`;
  return `❒ ${toTypewriterMono(rawLine)}`;
}

/**
 * Formats full list of signals into the exact Royal Al-Areen Telegram Monospace card:
 * 👑 العرين الذهبي — AL-AREEN AL-DAHABI 👑
 * 🔹 𝚄𝚃𝙲 ( +𝟶𝟹:𝟶𝟶 ) 🔻
 * ━━━━━━━━━━━━━━━━━━━━
 * ❒ 𝟷𝟻:𝟹𝟶 𝚄𝚂𝙳𝙳𝚉𝙳-𝙾𝚃𝙲 - 𝙱𝚄𝚈
 * ❒ 𝟷𝟻:𝟹𝟹 𝚄𝚂𝙳𝙳𝚉𝙳-𝙾𝚃𝙲 - 𝙿𝚄𝚃
 * ...
 */
export function formatAreenDecoratedTelegram(
  signals: FormattableSignal[],
  options?: {
    timeframe?: string;
    martingale?: string;
    utcOffset?: string;
    strategyName?: string;
  }
): string {
  if (signals.length === 0) return 'لا توجد صفقات حالياً';

  const timeframe = options?.timeframe || 'M1';
  const martingale = options?.martingale || 'NON MTG';
  const utcLine = formatUtcHeaderMono(options?.utcOffset || '+03:00');
  const tfText = timeframe === 'M5' ? 'M5 (5 دقائق)' : 'M1 (دقيقة واحدة)';

  const header = `👑 العرين الذهبي — AL-AREEN AL-DAHABI 👑
${utcLine}
━━━━━━━━━━━━━━━━━━━━`;

  const rows = signals.map(formatSingleSignalMono).join('\n');

  const footer = `━━━━━━━━━━━━━━━━━━━━
🦁 مدة الصفقة: ${tfText}
🛡️ نظام المضاعفة: ${martingale}
✨ اقتنص الأرباح داخل العرين الذهبي ✨`;

  return `${header}\n${rows}\n${footer}`;
}
