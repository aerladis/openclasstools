/* ============================================
   Book Upload Component - Shared across games
   Upload book screenshots, extract topics with AI
   ============================================ */

class BookUploadComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.gameType = options.gameType || 'general';
        this.onExtract = options.onExtract || (() => {});
        this.onError = options.onError || (() => {});
        this.onLoading = options.onLoading || (() => {});

        this.selectedFiles = [];
        this.extractedContent = null;
        this.topicData = null;

        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="book-upload-section">
                <div class="upload-header">
                    <span class="upload-icon">📚</span>
                    <h4>Upload Book Pages</h4>
                    <p class="upload-hint">Take photos of textbook pages or upload screenshots</p>
                </div>

                <div class="upload-dropzone" id="dropzone-${this.gameType}">
                    <input type="file" id="file-input-${this.gameType}"
                           accept="image/*,application/pdf" multiple
                           style="display: none;">
                    <div class="dropzone-content">
                        <span class="dropzone-icon">📷</span>
                        <p>Drag & drop files here or <span class="browse-link">browse</span></p>
                        <span class="file-types">Supports: JPG, PNG, WEBP, PDF (max 10MB)</span>
                    </div>
                </div>

                <div class="upload-preview" id="preview-${this.gameType}"></div>

                <button class="btn-upload-extract" id="btn-extract-${this.gameType}" disabled>
                    <span class="btn-icon">✨</span>
                    Extract Topics with AI
                </button>

                <div class="extracted-topics" id="topics-${this.gameType}" style="display: none;">
                    <h5>📖 Extracted Topics</h5>
                    <div class="topic-card">
                        <div class="topic-title" id="topic-title-${this.gameType}"></div>
                        <div class="topic-desc" id="topic-desc-${this.gameType}"></div>
                        <div class="topic-themes" id="topic-themes-${this.gameType}"></div>
                        <div class="topic-terms" id="topic-terms-${this.gameType}"></div>
                    </div>
                    <button class="btn-use-topic" id="btn-use-topic-${this.gameType}">
                        Use This Topic
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        const dropzone = this.container.querySelector(`#dropzone-${this.gameType}`);
        const fileInput = this.container.querySelector(`#file-input-${this.gameType}`);
        const browseLink = this.container.querySelector('.browse-link');
        const extractBtn = this.container.querySelector(`#btn-extract-${this.gameType}`);
        const useTopicBtn = this.container.querySelector(`#btn-use-topic-${this.gameType}`);

        browseLink.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('click', (event) => {
            if (event.target === dropzone || event.target.closest('.dropzone-content')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (event) => this.handleFiles(event.target.files));

        dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('dragover');
        }, { passive: false });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        }, { passive: true });

        dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleFiles(event.dataTransfer.files);
        }, { passive: false });

        extractBtn.addEventListener('click', () => this.extractTopics());

        useTopicBtn.addEventListener('click', () => {
            if (this.topicData) {
                this.onExtract({
                    content: this.extractedContent,
                    topicData: this.topicData
                });
            }
        });
    }

    handleFiles(files) {
        const validFiles = Array.from(files).filter((file) =>
            ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.type)
        );

        if (validFiles.length === 0) {
            this.onError('Please select valid files (JPG, PNG, WEBP, PDF)');
            return;
        }

        this.selectedFiles = validFiles.slice(0, 5);
        this.showPreview();
    }

    renderPreviewContent(file, index) {
        if (file.type === 'application/pdf') {
            return `
                <div class="preview-pdf" aria-label="PDF preview ${index + 1}">
                    <strong>PDF</strong>
                    <span>${file.name}</span>
                </div>
            `;
        }

        return `<img src="${URL.createObjectURL(file)}" alt="Preview ${index + 1}">`;
    }

    showPreview() {
        const preview = this.container.querySelector(`#preview-${this.gameType}`);
        const extractBtn = this.container.querySelector(`#btn-extract-${this.gameType}`);

        preview.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="preview-item">
                ${this.renderPreviewContent(file, index)}
                <button class="remove-file" data-index="${index}">x</button>
            </div>
        `).join('');

        preview.querySelectorAll('.remove-file').forEach((button) => {
            button.addEventListener('click', (event) => {
                const index = Number.parseInt(event.target.dataset.index, 10);
                this.selectedFiles.splice(index, 1);
                this.showPreview();
            });
        });

        extractBtn.disabled = this.selectedFiles.length === 0;
    }

    async extractTopics() {
        if (this.selectedFiles.length === 0) return;

        this.onLoading(true);
        const extractBtn = this.container.querySelector(`#btn-extract-${this.gameType}`);
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<span class="spinner-small"></span> Analyzing...';

        try {
            const formData = new FormData();
            this.selectedFiles.forEach((file) => {
                formData.append('images', file);
            });
            formData.append('gameType', this.gameType);

            const response = await fetch('/api/upload-book', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMessage = 'Failed to extract topics';

                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch {
                    // Keep the fallback error message.
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.extractedContent = data.extractedText;
            this.topicData = data.topicData;

            this.showExtractedTopics();
        } catch (err) {
            this.onError(err.message);
        } finally {
            this.onLoading(false);
            extractBtn.disabled = false;
            extractBtn.innerHTML = '<span class="btn-icon">✨</span> Extract Topics with AI';
        }
    }

    showExtractedTopics() {
        const topicsSection = this.container.querySelector(`#topics-${this.gameType}`);

        this.container.querySelector(`#topic-title-${this.gameType}`).textContent = this.topicData.title;
        this.container.querySelector(`#topic-desc-${this.gameType}`).textContent = this.topicData.description;

        const themesHtml = this.topicData.themes
            .map((theme) => `<span class="theme-tag">${theme}</span>`)
            .join('');
        this.container.querySelector(`#topic-themes-${this.gameType}`).innerHTML =
            '<strong>Themes:</strong> ' + themesHtml;

        const termsHtml = this.topicData.keyTerms
            .map((term) => `<span class="term-tag">${term}</span>`)
            .join('');
        this.container.querySelector(`#topic-terms-${this.gameType}`).innerHTML =
            '<strong>Key Terms:</strong> ' + termsHtml;

        topicsSection.style.display = 'block';
        topicsSection.scrollIntoView({ behavior: 'smooth' });
    }

    reset() {
        this.selectedFiles = [];
        this.extractedContent = null;
        this.topicData = null;

        this.container.querySelector(`#preview-${this.gameType}`).innerHTML = '';
        this.container.querySelector(`#topics-${this.gameType}`).style.display = 'none';
        this.container.querySelector(`#btn-extract-${this.gameType}`).disabled = true;
    }

    getExtractedData() {
        return {
            content: this.extractedContent,
            topicData: this.topicData
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookUploadComponent;
}
