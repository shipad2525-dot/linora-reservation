// ===== Linora nail & care — shared data & storage layer =====
// NOTE: This prototype uses localStorage so the booking flow and admin
// screen are fully demonstrable in the browser. For real production use
// (multi-device, LINE Messaging API push notifications to the owner),
// this data layer needs to be swapped for a real backend — see README.md.
//
// duration = 施術の目安所要時間(分)。空き時間の自動ブロックに使用します。
// 現時点では仮の目安値です。実際の所要時間に合わせて調整してください。

const LINORU_MENU = {
  care: {
    label: "NAIL CARE",
    items: [
      { id: "care1", name: "ネイルケア", price: 2000, duration: 30 },
      { id: "care2", name: "ネイル＋ハンドケア", price: 3000, duration: 60, disabled: true, disabledNote: "10月より受付開始" },
    ],
  },
  gel: {
    label: "GEL MENU",
    items: [
      { id: "gel1", name: "クリア", note: "甘皮処理＋自爪補強ジェル", price: 3500, duration: 40 },
      { id: "gel2", name: "ワンカラー", price: 4000, duration: 70 },
      { id: "gel3", name: "ラメグラデーション", price: 4000, duration: 70 },
      { id: "gel4", name: "カラーグラデーション", price: 4500, duration: 80 },
      { id: "gel5", name: "フレンチ", price: 4500, duration: 80 },
      { id: "gel6", name: "ニュアンス", price: 5000, priceUpTo: true, duration: 90 },
      { id: "gel6b", name: "マグネット", price: 5000, priceUpTo: true, duration: 80 },
      { id: "gel6c", name: "ミラー", price: 5000, priceUpTo: true, duration: 70 },
      { id: "gel7", name: "デザイン", price: 6000, priceUpTo: true, duration: 120 },
    ],
  },
  off: {
    label: "OFF",
    items: [
      { id: "off1", name: "当店付け替えオフ", price: 500, duration: 30 },
      { id: "off2", name: "他店付け替えオフ", price: 1000, duration: 50 },
      { id: "off3", name: "オフのみ（ケア込み）", price: 3000, duration: 60 },
    ],
  },
};

// 本数指定オプション（本数 × 単価、所要時間も本数に応じて加算）
const LINORU_OPTIONS = [
  { id: "opt5", name: "亀裂補強", price: 300, perNailDuration: 10 },
  { id: "opt6", name: "長さだし", price: 300, perNailDuration: 10 },
];

const LINORU_STORE_KEY = "linora_bookings_v1";
const LINORU_HOURS_KEY = "linora_hours_v1";

// business hours: 10:00–18:00, closed Tuesdays, 30-min slot grid
const DEFAULT_HOURS = {
  openMinutes: 10 * 60,
  closeMinutes: 18 * 60,
  closedWeekdays: [2], // 0=Sun ... 2=Tue
  slotStepMinutes: 30,
};

function loadHours() {
  try {
    const raw = localStorage.getItem(LINORU_HOURS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_HOURS;
  } catch (e) {
    return DEFAULT_HOURS;
  }
}

function saveHours(hours) {
  localStorage.setItem(LINORU_HOURS_KEY, JSON.stringify(hours));
}

function loadBookings() {
  try {
    const raw = localStorage.getItem(LINORU_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBookings(list) {
  localStorage.setItem(LINORU_STORE_KEY, JSON.stringify(list));
}

function addBooking(booking) {
  const list = loadBookings();
  booking.id = "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  booking.status = "pending";
  booking.createdAt = new Date().toISOString();
  list.push(booking);
  saveBookings(list);
  return booking;
}

function updateBookingStatus(id, status) {
  const list = loadBookings();
  const target = list.find((b) => b.id === id);
  if (target) target.status = status;
  saveBookings(list);
}

function deleteBooking(id) {
  const list = loadBookings().filter((b) => b.id !== id);
  saveBookings(list);
}

function yen(n) {
  return "¥" + n.toLocaleString("ja-JP");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function timeSlotsForDate(dateObj, hours) {
  const weekday = dateObj.getDay();
  if (hours.closedWeekdays.includes(weekday)) return [];
  const slots = [];
  for (let m = hours.openMinutes; m + hours.slotStepMinutes <= hours.closeMinutes; m += hours.slotStepMinutes) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

// 指定日の既存予約（キャンセル以外）を [開始分, 終了分] の範囲リストで返す
function occupiedRangesForDate(dateStr) {
  return loadBookings()
    .filter((b) => b.date === dateStr && b.status !== "cancelled")
    .map((b) => {
      const start = timeToMinutes(b.time);
      const dur = b.durationMinutes || 30;
      return [start, start + dur];
    });
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// durationMinutes の施術が startMinutes から開始できるか（営業時間内 かつ 重複なし）
function isSlotAvailable(startMinutes, durationMinutes, occupiedRanges, hours) {
  if (startMinutes + durationMinutes > hours.closeMinutes) return false;
  return !occupiedRanges.some(([s, e]) => rangesOverlap(startMinutes, startMinutes + durationMinutes, s, e));
}

// 指定日・指定所要時間で予約可能な開始時刻の一覧を返す
function availableSlotsForDate(dateObj, durationMinutes, hours) {
  const baseSlots = timeSlotsForDate(dateObj, hours);
  if (baseSlots.length === 0) return [];
  const occupied = occupiedRangesForDate(dateKey(dateObj));
  return baseSlots.map((t) => ({
    time: t,
    available: isSlotAvailable(timeToMinutes(t), durationMinutes, occupied, hours),
  }));
}

// カレンダー月表示用: その日に空きが最低1つでもあるか（ざっくり判定、メニュー未選択時用）
function dayHasAnyOpening(dateObj, hours) {
  const slots = availableSlotsForDate(dateObj, hours.slotStepMinutes, hours);
  return slots.some((s) => s.available);
}
