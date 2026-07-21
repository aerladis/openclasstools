/**
 * Universal Theme Controller (theme.js)
 * Fixed dark mode default — theme switch UI removed.
 */
(function () {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.ThemeController = {
        applyTheme: function() { document.documentElement.setAttribute('data-theme', 'dark'); },
        toggleTheme: function() {},
        getStoredTheme: function() { return 'dark'; }
    };
})();
