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
    if (Array.isArray(value)) {
        throw new TeacherContextError('Teacher name header must be a string', 'INVALID_TEACHER_NAME');
    }
    return typeof value === 'string' ? value.trim() : '';
}

function cleanTeacherName(value) {
    if (!value) return 'Teacher';
    const cleaned = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ');
    if (!cleaned) return 'Teacher';
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

export function extractTeacherContext(req) {
    const rawName = readHeader(req, 'x-teacher-name') || (
        typeof req?.body?.teacherDisplayName === 'string' ? req.body.teacherDisplayName : ''
    );
    const teacherDisplayName = cleanTeacherName(rawName);

    const rawKey = readHeader(req, 'x-gemini-api-key');
    const apiKey = (typeof rawKey === 'string' && rawKey.trim().length >= 10) ? rawKey.trim() : null;

    return {
        teacherDisplayName: teacherDisplayName || 'Teacher',
        keySource: apiKey ? 'teacher' : 'platform',
        apiKey,
        teacherKeyUsed: Boolean(apiKey)
    };
}

