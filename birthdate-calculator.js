const bdBirth = document.getElementById("bdBirth");
const bdAsOf = document.getElementById("bdAsOf");
const bdCalcBtn = document.getElementById("bdCalcBtn");
const bdTodayBtn = document.getElementById("bdTodayBtn");
const bdStatus = document.getElementById("bdStatus");
const bdAge = document.getElementById("bdAge");
const bdDays = document.getElementById("bdDays");
const bdWeekday = document.getElementById("bdWeekday");
const bdNext = document.getElementById("bdNext");

const bdPicker = document.getElementById("bdPicker");
const bdPickerDays = document.getElementById("bdPickerDays");
const bdPickerCells = document.getElementById("bdPickerCells");
const bdPrevMonth = document.getElementById("bdPrevMonth");
const bdNextMonth = document.getElementById("bdNextMonth");
const bdClearDate = document.getElementById("bdClearDate");
const bdPickToday = document.getElementById("bdPickToday");
const bdTitleMonth = document.getElementById("bdTitleMonth");
const bdTitleYear = document.getElementById("bdTitleYear");
const bdPickerCaption = document.getElementById("bdPickerCaption");
const bdPickerWeek = document.querySelector(".bd-picker-week");

let activeDateInput = null;
let pickerViewDate = new Date();
let pickerMode = "day";
const YEAR_MIN = 1800;
const YEAR_MAX = 2026;

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function setStatus(message, mode = "loading") {
    bdStatus.textContent = message;
    if (mode === "error") bdStatus.style.color = "#ef4444";
    else if (mode === "success") bdStatus.style.color = "#22c55e";
    else bdStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
}

function formatISO(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseISO(value) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
}

function parseTypedDate(value) {
    if (!value) return null;
    const raw = value.trim();
    if (!raw) return null;

    const ddmmyyyy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy) {
        const d = Number(ddmmyyyy[1]);
        const m = Number(ddmmyyyy[2]);
        const y = Number(ddmmyyyy[3]);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
            return date;
        }
    }

    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
        return parseISO(`${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`);
    }

    return null;
}

function getInputIso(input) {
    return input.dataset.iso || "";
}

function setInputDate(input, date) {
    input.dataset.iso = formatISO(date);
    input.value = formatDate(date);
    maybeAutoCalculate();
}

function clearInputDate(input) {
    input.dataset.iso = "";
    input.value = "";
}

function toDateOnly(value) {
    return parseISO(value);
}

function diffYMD(start, end) {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
        const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        days += prevMonthDays;
        months -= 1;
    }

    if (months < 0) {
        months += 12;
        years -= 1;
    }

    return { years, months, days };
}

function getNextBirthday(birth, asOf) {
    const m = birth.getMonth();
    const d = birth.getDate();
    let year = asOf.getFullYear();

    let next = new Date(year, m, d);
    if (next < asOf) {
        year += 1;
        next = new Date(year, m, d);
    }

    return next;
}

function hasBothDates() {
    return Boolean(getInputIso(bdBirth) && getInputIso(bdAsOf));
}

function maybeAutoCalculate() {
    if (!hasBothDates()) return;
    const birth = toDateOnly(getInputIso(bdBirth));
    const asOf = toDateOnly(getInputIso(bdAsOf));
    if (!birth || !asOf || birth > asOf) return;
    calculateAge();
}

function calculateAge() {
    const birth = toDateOnly(getInputIso(bdBirth));
    const asOf = toDateOnly(getInputIso(bdAsOf));

    if (!birth || !asOf) {
        setStatus("Please select both dates.", "error");
        return;
    }

    if (birth > asOf) {
        setStatus("Birth date cannot be after the calculation date.", "error");
        return;
    }

    const age = diffYMD(birth, asOf);
    const totalDays = Math.floor((asOf.getTime() - birth.getTime()) / 86400000);
    const nextBirthday = getNextBirthday(birth, asOf);
    const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - asOf.getTime()) / 86400000);

    bdAge.textContent = `${age.years} years, ${age.months} months, ${age.days} days`;
    bdDays.textContent = totalDays.toLocaleString();
    bdWeekday.textContent = birth.toLocaleDateString(undefined, { weekday: "long" });

    const birthdaySuffix = daysUntilBirthday === 0 ? "Today" : `in ${daysUntilBirthday} day${daysUntilBirthday === 1 ? "" : "s"}`;
    bdNext.textContent = `${formatDate(nextBirthday)} (${birthdaySuffix})`;
    setStatus("Age calculated successfully.", "success");
}

function setTodayAsOf() {
    setInputDate(bdAsOf, new Date());
}

function placePicker(anchorInput) {
    const rect = anchorInput.getBoundingClientRect();
    const margin = 8;

    bdPicker.style.top = "0px";
    bdPicker.style.left = "0px";
    bdPicker.style.visibility = "hidden";
    bdPicker.hidden = false;
    const pickerRect = bdPicker.getBoundingClientRect();

    let top = rect.bottom + margin;
    let left = rect.left;

    if (left + pickerRect.width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - pickerRect.width - margin);
    }
    if (top + pickerRect.height > window.innerHeight - margin) {
        top = rect.top - pickerRect.height - margin;
    }
    if (top < margin) {
        top = Math.max(margin, window.innerHeight - pickerRect.height - margin);
    }

    bdPicker.style.top = `${Math.round(top)}px`;
    bdPicker.style.left = `${Math.round(left)}px`;
    bdPicker.style.visibility = "visible";
}

function renderCalendarDays(viewDate, selectedDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayIso = formatISO(new Date());
    const selectedIso = selectedDate ? formatISO(selectedDate) : "";
    const cells = [];

    for (let i = firstDay - 1; i >= 0; i -= 1) {
        cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), out: true });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
        cells.push({ date: new Date(year, month, d), out: false });
    }

    while (cells.length % 7 !== 0 || cells.length < 35) {
        const day = cells.length - (firstDay + daysInMonth) + 1;
        cells.push({ date: new Date(year, month + 1, day), out: true });
    }

    bdPickerDays.innerHTML = "";
    for (const cell of cells) {
        const iso = formatISO(cell.date);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bd-day";
        if (cell.out) btn.classList.add("is-out");
        if (iso === todayIso) btn.classList.add("is-today");
        if (iso === selectedIso) btn.classList.add("is-selected");
        btn.dataset.iso = iso;
        btn.textContent = String(cell.date.getDate());
        bdPickerDays.appendChild(btn);
    }
}

function renderMonthCells(selectedDate) {
    const selectedMonth = selectedDate ? selectedDate.getMonth() : -1;
    bdPickerCells.innerHTML = "";
    MONTH_NAMES_SHORT.forEach((name, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bd-cell";
        if (idx === selectedMonth && pickerViewDate.getFullYear() === (selectedDate ? selectedDate.getFullYear() : -1)) {
            btn.classList.add("is-selected");
        }
        btn.dataset.month = String(idx);
        btn.textContent = name;
        bdPickerCells.appendChild(btn);
    });
}

function renderYearCells(selectedDate) {
    const selectedYear = selectedDate ? selectedDate.getFullYear() : -1;
    bdPickerCells.innerHTML = "";
    for (let y = YEAR_MIN; y <= YEAR_MAX; y += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bd-cell";
        if (y === selectedYear) btn.classList.add("is-selected");
        btn.dataset.year = String(y);
        btn.textContent = String(y);
        bdPickerCells.appendChild(btn);
    }
}

function renderPicker() {
    const selected = activeDateInput ? parseISO(getInputIso(activeDateInput)) : null;
    const monthLabel = pickerViewDate.toLocaleDateString(undefined, { month: "long" });
    const yearLabel = String(pickerViewDate.getFullYear());
    bdTitleMonth.textContent = monthLabel;
    bdTitleYear.textContent = yearLabel;

    const isDayMode = pickerMode === "day";
    bdPickerDays.hidden = !isDayMode;
    bdPickerWeek.hidden = !isDayMode;
    bdPickerCells.hidden = isDayMode;
    bdPickerDays.style.display = isDayMode ? "grid" : "none";
    bdPickerWeek.style.display = isDayMode ? "grid" : "none";
    bdPickerCells.style.display = isDayMode ? "none" : "grid";
    const isYearMode = pickerMode === "year";
    bdPrevMonth.hidden = isYearMode;
    bdNextMonth.hidden = isYearMode;
    bdPickerCells.classList.toggle("is-year-grid", pickerMode === "year");
    bdTitleMonth.hidden = pickerMode === "year";
    bdTitleYear.hidden = pickerMode === "year";
    bdPickerCaption.hidden = pickerMode !== "year";

    if (pickerMode === "day") {
        bdPickerCaption.textContent = "";
        renderCalendarDays(pickerViewDate, selected);
    } else if (pickerMode === "month") {
        bdPickerCaption.textContent = "";
        renderMonthCells(selected);
    } else {
        bdPickerCaption.textContent = `${YEAR_MIN} - ${YEAR_MAX}`;
        renderYearCells(selected);
    }

    if (activeDateInput) placePicker(activeDateInput);

    if (pickerMode === "year" && selected) {
        const selectedBtn = bdPickerCells.querySelector(`[data-year="${selected.getFullYear()}"]`);
        if (selectedBtn) selectedBtn.scrollIntoView({ block: "center" });
    }
}

function closePicker() {
    bdPicker.hidden = true;
    bdPicker.style.visibility = "";
    document.querySelectorAll("[data-date-wrap].is-open").forEach((el) => el.classList.remove("is-open"));
    activeDateInput = null;
}

function openPicker(input) {
    const wrap = input.closest("[data-date-wrap]");
    if (!wrap) return;

    activeDateInput = input;
    const selected = parseISO(getInputIso(input)) || new Date();
    pickerViewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
    pickerMode = "day";

    document.querySelectorAll("[data-date-wrap].is-open").forEach((el) => el.classList.remove("is-open"));
    wrap.classList.add("is-open");
    document.body.appendChild(bdPicker);
    renderPicker();
}

bdCalcBtn.addEventListener("click", calculateAge);
bdTodayBtn.addEventListener("click", () => {
    setTodayAsOf();
    calculateAge();
});

bdPrevMonth.addEventListener("click", () => {
    if (pickerMode === "day") {
        pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() - 1, 1);
    } else if (pickerMode === "month") {
        pickerViewDate = new Date(pickerViewDate.getFullYear() - 1, pickerViewDate.getMonth(), 1);
    }
    renderPicker();
});

bdNextMonth.addEventListener("click", () => {
    if (pickerMode === "day") {
        pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() + 1, 1);
    } else if (pickerMode === "month") {
        pickerViewDate = new Date(pickerViewDate.getFullYear() + 1, pickerViewDate.getMonth(), 1);
    }
    renderPicker();
});

bdTitleMonth.addEventListener("click", () => {
    pickerMode = "month";
    renderPicker();
});

bdTitleYear.addEventListener("click", () => {
    pickerMode = "year";
    renderPicker();
});

bdPickerDays.addEventListener("click", (event) => {
    const btn = event.target.closest(".bd-day");
    if (!btn || !activeDateInput) return;
    const selected = parseISO(btn.dataset.iso);
    if (!selected) return;
    setInputDate(activeDateInput, selected);
    closePicker();
});

bdPickerCells.addEventListener("click", (event) => {
    const btn = event.target.closest(".bd-cell");
    if (!btn) return;

    if (btn.dataset.month !== undefined) {
        pickerViewDate = new Date(pickerViewDate.getFullYear(), Number(btn.dataset.month), 1);
        pickerMode = "day";
        renderPicker();
        return;
    }

    if (btn.dataset.year !== undefined) {
        pickerViewDate = new Date(Number(btn.dataset.year), pickerViewDate.getMonth(), 1);
        pickerMode = "day";
        renderPicker();
    }
});

bdClearDate.addEventListener("click", () => {
    if (!activeDateInput) return;
    clearInputDate(activeDateInput);
    closePicker();
});

bdPickToday.addEventListener("click", () => {
    if (!activeDateInput) return;
    const now = new Date();
    setInputDate(activeDateInput, now);
    closePicker();
});

[bdBirth, bdAsOf].forEach((input) => {
    input.addEventListener("blur", () => {
        const parsed = parseTypedDate(input.value);
        if (!input.value.trim()) {
            clearInputDate(input);
            return;
        }
        if (parsed) {
            setInputDate(input, parsed);
        } else {
            input.value = "";
            input.dataset.iso = "";
            setStatus("Use DD-MM-YYYY format, for example 12-02-2000.", "error");
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const parsed = parseTypedDate(input.value);
            if (parsed) {
                setInputDate(input, parsed);
            } else if (input.value.trim()) {
                setStatus("Use DD-MM-YYYY format, for example 12-02-2000.", "error");
                return;
            }
            if (hasBothDates()) calculateAge();
            return;
        }
        if ((event.key === " " || event.key === "ArrowDown") && bdPicker.hidden) {
            event.preventDefault();
            openPicker(input);
        }
    });
});

document.querySelectorAll("[data-date-open]").forEach((button) => {
    button.addEventListener("click", () => {
        const wrap = button.closest("[data-date-wrap]");
        const input = wrap ? wrap.querySelector("input") : null;
        if (input) openPicker(input);
    });
});

document.addEventListener("click", (event) => {
    if (bdPicker.hidden) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("#bdPicker") || target.closest("[data-date-wrap]")) return;
    closePicker();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !bdPicker.hidden) {
        closePicker();
        return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
        const target = event.target;
        if (target instanceof HTMLElement && target.tagName === "TEXTAREA") return;
        if (hasBothDates()) {
            event.preventDefault();
            calculateAge();
        }
    }
});

window.addEventListener("resize", () => {
    if (!bdPicker.hidden && activeDateInput) placePicker(activeDateInput);
});

window.addEventListener("scroll", () => {
    if (!bdPicker.hidden && activeDateInput) placePicker(activeDateInput);
}, true);

setTodayAsOf();
