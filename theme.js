/**
 * Universal Theme Controller (theme.js)
 * Manages light/dark mode state with localStorage persistence and injects floating toggle UI.
 */
(function () {
    const STORAGE_KEY = 'openclasstools_theme';

    function getStoredTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);

        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            btn.title = theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
        }

        if (window.OptimizedParticles && window.OptimizedParticles.updateColors) {
            window.OptimizedParticles.updateColors(theme);
        }
    }

    function toggleTheme() {
        const current = getStoredTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    }

    function initThemeUI() {
        const initialTheme = getStoredTheme();
        document.documentElement.setAttribute('data-theme', initialTheme);

        function injectButton() {
            if (document.getElementById('themeToggleBtn')) return;
            const btn = document.createElement('button');
            btn.id = 'themeToggleBtn';
            btn.className = 'theme-toggle-btn';
            btn.type = 'button';
            btn.innerHTML = initialTheme === 'dark' ? '☀️' : '🌙';
            btn.title = initialTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
            btn.addEventListener('click', toggleTheme);
            document.body.appendChild(btn);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectButton);
        } else {
            injectButton();
        }
    }

    initThemeUI();
    window.ThemeController = { applyTheme, toggleTheme, getStoredTheme };
})();
