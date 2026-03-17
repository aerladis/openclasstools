/* ============================================
   Generated Content Store
   Persist last generated packs per game
   ============================================ */

(function initGeneratedContentStore() {
    const STORAGE_PREFIX = 'berkai-generated-content';

    function isStorageAvailable() {
        try {
            const testKey = `${STORAGE_PREFIX}:test`;
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    function getStorageKey(gameKey) {
        return `${STORAGE_PREFIX}:${gameKey}`;
    }

    function save(gameKey, payload) {
        if (!isStorageAvailable()) return null;

        const record = {
            savedAt: new Date().toISOString(),
            ...payload
        };

        window.localStorage.setItem(getStorageKey(gameKey), JSON.stringify(record));
        return record;
    }

    function load(gameKey) {
        if (!isStorageAvailable()) return null;

        const raw = window.localStorage.getItem(getStorageKey(gameKey));
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            window.localStorage.removeItem(getStorageKey(gameKey));
            return null;
        }
    }

    function clear(gameKey) {
        if (!isStorageAvailable()) return;
        window.localStorage.removeItem(getStorageKey(gameKey));
    }

    function formatTimestamp(isoString) {
        if (!isoString) return '';

        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return '';

        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    window.generatedContentStore = {
        save,
        load,
        clear,
        formatTimestamp
    };
})();
