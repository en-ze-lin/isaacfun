const slides = [...document.querySelectorAll(".gallery-slide")];
const dots = [...document.querySelectorAll(".gallery-dots button")];
let slideIndex = 0;
let galleryTimer;

function showSlide(nextIndex) {
  slideIndex = (nextIndex + slides.length) % slides.length;
  slides.forEach((slide, index) => slide.classList.toggle("active", index === slideIndex));
  dots.forEach((dot, index) => {
    const active = index === slideIndex;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-selected", String(active));
  });
}

function startGallery() {
  clearInterval(galleryTimer);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  galleryTimer = window.setInterval(() => showSlide(slideIndex + 1), 6500);
}

document.querySelector(".gallery-prev")?.addEventListener("click", () => {
  showSlide(slideIndex - 1);
  startGallery();
});
document.querySelector(".gallery-next")?.addEventListener("click", () => {
  showSlide(slideIndex + 1);
  startGallery();
});
dots.forEach((dot, index) => dot.addEventListener("click", () => {
  showSlide(index);
  startGallery();
}));
startGallery();

const menuButton = document.querySelector(".menu-button");
const primaryNav = document.querySelector(".primary-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  primaryNav?.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
});
primaryNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuButton?.setAttribute("aria-expanded", "false");
  primaryNav.classList.remove("open");
  document.body.classList.remove("menu-open");
}));

const quickPanel = document.querySelector("#quick-panel");
const quickPanelContent = document.querySelector(".quick-panel-content");
const panelTitle = document.querySelector("#quick-panel-title");
const dateLabel = document.querySelector("[data-date-label]");
const guestLabel = document.querySelector("[data-guest-label]");
const roomLabel = document.querySelector("[data-room-label]");
const quickState = { checkIn: "", checkOut: "", guests: 1, room: "pocket" };
const quickToday = new Date();
quickToday.setHours(0, 0, 0, 0);
let quickVisibleMonth = new Date(quickToday.getFullYear(), quickToday.getMonth(), 1);

const formatDate = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
const isoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const dateFromISO = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

function updateQuickLabels() {
  dateLabel.textContent = quickState.checkIn && quickState.checkOut
    ? `${formatDate(dateFromISO(quickState.checkIn))} – ${formatDate(dateFromISO(quickState.checkOut))}`
    : "Choose dates";
  guestLabel.textContent = `${quickState.guests} guest${quickState.guests === 1 ? "" : "s"}`;
  roomLabel.textContent = quickState.room === "window" ? "Window Pocket" : "Pocket Capsule";
}

function closeQuickPanel() {
  quickPanel.hidden = true;
  document.body.classList.remove("panel-open");
}

function openQuickPanel(type) {
  quickPanel.hidden = false;
  document.body.classList.add("panel-open");
  if (type === "dates") renderQuickDates();
  if (type === "guests") renderQuickGuests();
  if (type === "room") renderQuickRooms();
  document.querySelector(".panel-close")?.focus();
}

function renderQuickDates() {
  panelTitle.textContent = "Choose check-in and check-out";
  quickPanelContent.innerHTML = `
    <p class="quick-calendar-note">Choose check-in, then check-out. / チェックイン日、チェックアウト日の順に選択してください。</p>
    <div class="calendar quick-calendar">
      <div class="calendar-header">
        <button class="icon-button quick-month-prev" type="button" aria-label="Previous month">←</button>
        <h3 class="calendar-month">${quickVisibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
        <button class="icon-button quick-month-next" type="button" aria-label="Next month">→</button>
      </div>
      <div class="weekdays" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
      <div class="calendar-grid"></div>
    </div>
    <button class="button button-primary quick-done" type="button" style="width:100%;margin-top:18px">
      <span>Use these dates</span><small>この日付を使う</small>
    </button>`;
  const grid = quickPanelContent.querySelector(".calendar-grid");
  const firstWeekday = quickVisibleMonth.getDay();
  const daysInMonth = new Date(quickVisibleMonth.getFullYear(), quickVisibleMonth.getMonth() + 1, 0).getDate();
  for (let index = 0; index < firstWeekday; index += 1) grid.append(document.createElement("span"));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(quickVisibleMonth.getFullYear(), quickVisibleMonth.getMonth(), day);
    const value = isoDate(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.dataset.date = value;
    button.textContent = String(day);
    button.disabled = date <= quickToday;
    button.classList.toggle("selected", value === quickState.checkIn || value === quickState.checkOut);
    button.classList.toggle("in-range", Boolean(quickState.checkIn && quickState.checkOut && value > quickState.checkIn && value < quickState.checkOut));
    button.setAttribute("aria-label", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    button.addEventListener("click", () => {
      if (!quickState.checkIn || quickState.checkOut || value <= quickState.checkIn) {
        quickState.checkIn = value;
        quickState.checkOut = "";
      } else {
        quickState.checkOut = value;
      }
      renderQuickDates();
    });
    grid.append(button);
  }
  const currentMonth = new Date(quickToday.getFullYear(), quickToday.getMonth(), 1);
  const previousButton = quickPanelContent.querySelector(".quick-month-prev");
  previousButton.disabled = quickVisibleMonth <= currentMonth;
  previousButton.addEventListener("click", () => {
    quickVisibleMonth = new Date(quickVisibleMonth.getFullYear(), quickVisibleMonth.getMonth() - 1, 1);
    renderQuickDates();
  });
  quickPanelContent.querySelector(".quick-month-next").addEventListener("click", () => {
    quickVisibleMonth = new Date(quickVisibleMonth.getFullYear(), quickVisibleMonth.getMonth() + 1, 1);
    renderQuickDates();
  });
  quickPanelContent.querySelector(".quick-done").addEventListener("click", () => {
    if (!quickState.checkOut) {
      const fallback = new Date(quickToday);
      fallback.setDate(fallback.getDate() + 1);
      const next = dateFromISO(quickState.checkIn || isoDate(fallback));
      next.setDate(next.getDate() + 1);
      quickState.checkIn ||= isoDate(fallback);
      quickState.checkOut = isoDate(next);
    }
    updateQuickLabels();
    closeQuickPanel();
  });
}

function renderQuickGuests() {
  panelTitle.textContent = "Choose number of guests";
  quickPanelContent.innerHTML = `
    <div class="quick-counter">
      <div><strong>Travelers</strong><small class="jp" lang="ja">宿泊者</small></div>
      <div class="quick-counter-controls">
        <button type="button" data-action="minus" aria-label="Remove guest">−</button>
        <output>${quickState.guests}</output>
        <button type="button" data-action="plus" aria-label="Add guest">+</button>
      </div>
    </div>
    <button class="button button-primary quick-done" type="button" style="width:100%;margin-top:18px"><span>Confirm guests</span><small>人数を確定</small></button>`;
  quickPanelContent.querySelector("[data-action='minus']").addEventListener("click", () => {
    quickState.guests = Math.max(1, quickState.guests - 1);
    renderQuickGuests();
  });
  quickPanelContent.querySelector("[data-action='plus']").addEventListener("click", () => {
    quickState.guests = Math.min(4, quickState.guests + 1);
    renderQuickGuests();
  });
  quickPanelContent.querySelector(".quick-done").addEventListener("click", () => {
    updateQuickLabels();
    closeQuickPanel();
  });
}

function renderQuickRooms() {
  panelTitle.textContent = "Choose a room";
  quickPanelContent.innerHTML = `
    <div class="quick-room-options">
      <button type="button" data-room="pocket"><strong>Pocket Capsule</strong><small>ポケットカプセル · ¥7,900</small></button>
      <button type="button" data-room="window"><strong>Window Pocket</strong><small>ウィンドウポケット · ¥9,800</small></button>
    </div>`;
  quickPanelContent.querySelectorAll("[data-room]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.room === quickState.room);
    button.addEventListener("click", () => {
      quickState.room = button.dataset.room;
      updateQuickLabels();
      closeQuickPanel();
    });
  });
}

document.querySelectorAll("[data-quick]").forEach((button) => button.addEventListener("click", () => openQuickPanel(button.dataset.quick)));
document.querySelector(".panel-close")?.addEventListener("click", closeQuickPanel);
quickPanel?.addEventListener("click", (event) => {
  if (event.target === quickPanel) closeQuickPanel();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !quickPanel.hidden) closeQuickPanel();
});

document.querySelector(".quick-submit")?.addEventListener("click", () => {
  const params = new URLSearchParams();
  if (quickState.checkIn) params.set("checkin", quickState.checkIn);
  if (quickState.checkOut) params.set("checkout", quickState.checkOut);
  params.set("guests", String(quickState.guests));
  params.set("room", quickState.room);
  window.location.href = `./booking.html?${params}`;
});

document.querySelector(".notify-button")?.addEventListener("click", (event) => {
  event.currentTarget.disabled = true;
  event.currentTarget.querySelector("span").textContent = "Notification noted";
  event.currentTarget.querySelector("small").textContent = "お知らせ登録済み";
  document.querySelector(".notify-message").textContent = "We’ll add updates here when the room scan is ready. / 3Dスキャン公開時にこちらでお知らせします。";
});

const mobileBook = document.querySelector(".mobile-book");
let mobileBookFrame;

function updateMobileBookVisibility() {
  if (!mobileBook) return;
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = window.scrollY / scrollable;
  const shouldShow = window.matchMedia("(max-width: 820px)").matches && progress >= 0.55;
  mobileBook.classList.toggle("is-visible", shouldShow);
}

function queueMobileBookUpdate() {
  if (mobileBookFrame) return;
  mobileBookFrame = window.requestAnimationFrame(() => {
    updateMobileBookVisibility();
    mobileBookFrame = null;
  });
}

window.addEventListener("scroll", queueMobileBookUpdate, { passive: true });
window.addEventListener("resize", queueMobileBookUpdate);
updateMobileBookVisibility();
