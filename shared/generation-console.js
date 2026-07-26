(function initializeGenerationConsole(root) {
    'use strict';

    const CSS_LOADED = 'generationConsoleCssLoaded';
    let activeOverlay = null;
    let logList = null;

    function loadStyles() {
        if (root.document && !root[CSS_LOADED]) {
            const link = root.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/shared/generation-console.css';
            root.document.head.appendChild(link);
            root[CSS_LOADED] = true;
        }
    }

    function ensureOverlay() {
        if (!root.document) return null;
        if (activeOverlay) return activeOverlay;

        loadStyles();
        const overlay = root.document.createElement('div');
        overlay.className = 'generation-console-overlay';
        overlay.innerHTML = [
            '<div class="generation-console">',
            '  <div class="generation-console__header">',
            '    <span>AI Generation Console</span>',
            '  </div>',
            '  <ul class="generation-console__list"></ul>',
            '</div>'
        ].join('');
        root.document.body.appendChild(overlay);
        activeOverlay = overlay;
        logList = overlay.querySelector('.generation-console__list');
        return overlay;
    }

    function formatTime() {
        const now = new Date();
        return [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join(':');
    }

    function log(message, type) {
        const overlay = ensureOverlay();
        if (!overlay || !logList) return;

        const item = root.document.createElement('li');
        item.className = 'generation-console__item';
        if (type === 'error') item.classList.add('generation-console__item--error');

        const time = root.document.createElement('span');
        time.className = 'generation-console__time';
        time.textContent = formatTime();

        const text = root.document.createElement('span');
        text.className = 'generation-console__message';
        text.textContent = message;

        item.appendChild(time);
        item.appendChild(text);
        logList.appendChild(item);
        logList.scrollTop = logList.scrollHeight;
    }

    function show() {
        const overlay = ensureOverlay();
        if (overlay) overlay.style.display = 'flex';
    }

    function hide() {
        if (activeOverlay) {
            activeOverlay.style.display = 'none';
        }
    }

    function clear() {
        if (logList) logList.innerHTML = '';
    }

    root.GenerationConsole = Object.freeze({
        show: show,
        hide: hide,
        log: log,
        clear: clear
    });
}(typeof window !== 'undefined' ? window : globalThis));
