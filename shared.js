// ===== Linora nail & care — shared data & storage layer =====
// NOTE: This prototype uses localStorage so the booking flow and admin
// screen are fully demonstrable in the browser. For real production use
// (multi-device, LINE Messaging API push notifications to the owner),
// this data layer needs to be swapped for a real backend — see README.md.

const LINORU_MENU = {
  care: {
    label: "NAIL CARE",
    items: [
      { id: "care1", name: "ネイルケア", price: 2000, duration: 40 },
      { id: "care2", name: "ネイル＋ハンドケア", price: 3000, duration: 60 },
    ],
  },
  gel: {
    label: "GEL MENU",
    items: [
      { id: "gel1", name: "クリア", price: 3500, duration: 60 },
      { id: "gel2", name: "ワンカラー", price: 4000, duration: 75 },
      { id: "gel3", name: "ラメグラデーション", price: 4000, duration: 75 },
      { id: "gel4", name: "カラーグラデーション", price: 4500, duration: 90 },
      { id: "gel5", name: "フレンチ", price: 4500, duration: 90 },
      { id: "gel6", name: "ニュアンス／マグネット／ミラー", price: 5000, priceUpTo: true, duration: 100 },
      { id: "gel7", name: "デザイン", price: 6000, priceUpTo: true, duration: 110 },
    ],
  },
  off: {
    label: "OFF",
    items: [
      { id: "off1", name: "当店付け替えオフ", price: 500, duration: 15 },
      { id: "off2", name: "他店付け替えオフ", price: 1000, duration: 20 },
      { id: "off3", name: "オフのみ（ケア込み）", price: 3000, duration: 40 },
    ],
  },
};

const LINORU_OPTIONS = [
  { id: "opt1", name: "アート", price: 200, priceUpTo: true },
  { id: "opt2", name: "色追加", price: 100 },
  { id: "opt3", name: "シール", price: 100, priceUpTo: true },
  { id: "opt4", name: "ストーン、パーツ", price: 100, priceUpTo: true },
  { id: "opt5", name: "亀裂補強（1本）", price: 300 },
  { id: "opt6", name: "長さだし（1本）", price: 300 },
];

const LINORU_STORE_KEY = "linoru_bookings_v1";
const LINORU_HOURS_KEY = "linoru_hours_v1";

// business hours: default 10:00–19:00, closed Tuesdays, 30-min slots
const DEFAULT_HOURS = {
  openMinutes: 10 * 60,
  closeMinutes: 19 * 60,
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

function timeSlotsForDate(dateObj, hours) {
  const weekday = dateObj.getDay();
  if (hours.closedWeekdays.includes(weekday)) return [];
  const slots = [];
  for (let m = hours.openMinutes; m + hours.slotStepMinutes <= hours.closeMinutes; m += hours.slotStepMinutes) {
    slots.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
  }
  return slots;
}
