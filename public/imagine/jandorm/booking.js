const form = document.querySelector("#booking-form");
const params = new URLSearchParams(window.location.search);
const roomRates = { pocket: 7900, window: 9800 };
const addonRates = { bag: 1800, workshop: 2500 };
const roomNames = { pocket: "Pocket Capsule", window: "Window Pocket" };
const addonNames = { bag: "Bag Onsen", workshop: "Guided Workshop" };
const today = new Date();
today.setHours(0, 0, 0, 0);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let checkIn = params.get("checkin") || "";
let checkOut = params.get("checkout") || "";
let guests = Math.min(4, Math.max(1, Number(params.get("guests")) || 1));

function fromISO(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDate(value) {
  const date = fromISO(value);
  return date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date) : "Not selected";
}

function nightsCount() {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, Math.round((fromISO(checkOut) - fromISO(checkIn)) / 86400000));
}

function renderCalendar() {
  const grid = document.querySelector(".calendar-grid");
  const monthTitle = document.querySelector(".calendar-month");
  grid.innerHTML = "";
  monthTitle.textContent = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = visibleMonth.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  for (let index = 0; index < firstWeekday; index += 1) grid.append(document.createElement("span"));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    const value = toISO(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);
    button.dataset.date = value;
    button.disabled = date <= today;
    const selected = value === checkIn || value === checkOut;
    const inRange = checkIn && checkOut && value > checkIn && value < checkOut;
    button.classList.toggle("selected", selected);
    button.classList.toggle("in-range", Boolean(inRange));
    button.setAttribute("aria-label", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    button.addEventListener("click", () => chooseDate(value));
    grid.append(button);
  }
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  document.querySelector(".calendar-prev").disabled = visibleMonth <= currentMonth;
}

function chooseDate(value) {
  if (!checkIn || checkOut || value <= checkIn) {
    checkIn = value;
    checkOut = "";
  } else {
    checkOut = value;
  }
  renderCalendar();
  updateSummary();
}

function updateSummary() {
  document.querySelector("[data-checkin]").textContent = shortDate(checkIn);
  document.querySelector("[data-checkout]").textContent = shortDate(checkOut);
  document.querySelector("[data-guests]").textContent = guests;
  document.querySelector("[data-summary-guests]").textContent = `${guests} guest${guests === 1 ? "" : "s"}`;
  document.querySelector("[data-summary-dates]").textContent = checkIn && checkOut ? `${shortDate(checkIn)} – ${shortDate(checkOut)}` : "Select dates";

  const room = form.elements.room.value;
  document.querySelector("[data-summary-room]").textContent = roomNames[room];
  const selectedAddons = [...form.querySelectorAll("input[name='addons']:checked")].map((input) => input.value);
  document.querySelector("[data-summary-addons]").textContent = selectedAddons.length ? selectedAddons.map((addon) => addonNames[addon]).join(", ") : "None";
  const total = nightsCount() * roomRates[room] * guests + selectedAddons.reduce((sum, addon) => sum + addonRates[addon], 0);
  document.querySelector("[data-total]").textContent = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(total);
}

document.querySelector(".calendar-prev").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.querySelector(".calendar-next").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});
document.querySelector(".counter-minus").addEventListener("click", () => {
  guests = Math.max(1, guests - 1);
  updateSummary();
});
document.querySelector(".counter-plus").addEventListener("click", () => {
  guests = Math.min(4, guests + 1);
  updateSummary();
});
form.querySelectorAll("input[name='room'], input[name='addons']").forEach((input) => input.addEventListener("change", updateSummary));

const requestedRoom = params.get("room");
if (requestedRoom && roomRates[requestedRoom]) form.querySelector(`input[name="room"][value="${requestedRoom}"]`).checked = true;
const requestedAddon = params.get("addon");
if (requestedAddon && addonRates[requestedAddon]) form.querySelector(`input[name="addons"][value="${requestedAddon}"]`).checked = true;
if (checkIn) visibleMonth = new Date(fromISO(checkIn).getFullYear(), fromISO(checkIn).getMonth(), 1);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector(".form-status");
  if (!checkIn || !checkOut) {
    status.textContent = "Please choose check-in and check-out dates. / チェックイン日とチェックアウト日を選択してください。";
    document.querySelector(".calendar").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!form.reportValidity()) {
    status.textContent = "Please complete the required guest details. / 必須の宿泊者情報を入力してください。";
    return;
  }
  const reservation = {
    checkIn,
    checkOut,
    guests,
    room: form.elements.room.value,
    addons: [...form.querySelectorAll("input[name='addons']:checked")].map((input) => input.value),
    name: form.elements.name.value,
    email: form.elements.email.value,
    note: form.elements.note.value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem("jandorm-concept-reservation", JSON.stringify(reservation));
  document.querySelector(".confirmation").hidden = false;
  document.body.classList.add("panel-open");
});

document.querySelector(".confirmation-close").addEventListener("click", () => {
  document.querySelector(".confirmation").hidden = true;
  document.body.classList.remove("panel-open");
});

renderCalendar();
updateSummary();
