export class TeacherContextError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'TeacherContextError';
        this.status = 400;
        this.code = code;
    }
}

function readHeader(req, name) {
    const value = req?.headers?.[name];
    return typeof value === 'string' ? value.trim() : '';
}

function cleanTeacherName(value) {
    if (!value) {
        throw new TeacherContextError('Teacher name is required', 'TEACHER_NAME_REQUIRED');
    }
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ');
    if (!cleaned) {
        throw new TeacherContextError('Teacher name is required', 'TEACHER_NAME_REQUIRED');
    }
    if (cleaned.length > 120) {
        throw new TeacherContextError('Teacher name must be at most 120 characters', 'INVALID_TEACHER_NAME');
    }
    return cleaned;
}

function requireKey(value, message, code) {
    if (typeof value !== 'string' || value.trim().length < 10) {
        throw new TeacherContextError(message, code);
    }
    return value.trim();
}

export function extractTeacherContext(req, { geminiApiKey = '' } = {}) {
    const teacherDisplayName = cleanTeacherName(
        readHeader(req, 'x-teacher-name') || (
            typeof req?.body?.teacherDisplayName === 'string' ? req.body.teacherDisplayName : ''
        )
    );
    const keySource = readHeader(req, 'x-ai-key-source');

    if (!['teacher', 'platform'].includes(keySource)) {
        throw new TeacherContextError(
            'Choose either the teacher key or the platform key',
            'AI_KEY_SOURCE_REQUIRED'
        );
    }

    if (keySource === 'teacher') {
        const apiKey = requireKey(
            readHeader(req, 'x-gemini-api-key'),
            'A teacher Gemini API key is required',
            'TEACHER_AI_KEY_REQUIRED'
        );
        return {
            teacherDisplayName,
            keySource,
            apiKey,
            teacherKeyUsed: true
        };
    }

    return {
        teacherDisplayName,
        keySource,
        apiKey: requireKey(
            geminiApiKey,
            'The platform Gemini key is not configured',
            'PLATFORM_AI_KEY_UNAVAILABLE'
        ),
        teacherKeyUsed: false
    };
}

