(function () {
    const STORAGE_KEY = "thumb-theme";

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const toggleButtons = document.querySelectorAll("[data-theme-toggle]");
        toggleButtons.forEach((button) => {
            button.classList.toggle("is-dark", theme === "dark");
            button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
        });
    }

    function getInitialTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "dark" || saved === "light") {
            return saved;
        }
        return "dark";
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    }

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(getInitialTheme());
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.addEventListener("click", toggleTheme);
        });
    });
})();
