import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TeacherContextError,
    extractTeacherContext
} from '../server/http/teacher-context.js';

test('selects a teacher key without exposing platform credentials', () => {
    const context = extractTeacherContext({
        headers: {
            'x-teacher-name': '  Ms Ada  ',
            'x-ai-key-source': 'teacher',
            'x-gemini-api-key': 'teacher-secret-key-123'
        },
        body: {}
    }, { geminiApiKey: 'platform-secret' });

    assert.deepEqual(context, {
        teacherDisplayName: 'Ms Ada',
        keySource: 'teacher',
        apiKey: 'teacher-secret-key-123',
        teacherKeyUsed: true
    });
});

test('selects the platform key only when explicitly requested', () => {
    const context = extractTeacherContext({
        headers: {
            'x-teacher-name': 'Ms Ada',
            'x-ai-key-source': 'platform'
        },
        body: {}
    }, { geminiApiKey: 'platform-secret-key-123' });

    assert.equal(context.apiKey, 'platform-secret-key-123');
    assert.equal(context.teacherKeyUsed, false);
});

test('rejects missing teacher name, key source, and selected key', () => {
    assert.throws(
        () => extractTeacherContext({ headers: {}, body: {} }, {}),
        error => error instanceof TeacherContextError && error.code === 'TEACHER_NAME_REQUIRED'
    );
    assert.throws(
        () => extractTeacherContext({
            headers: { 'x-teacher-name': 'Ms Ada' },
            body: {}
        }, {}),
        error => error.code === 'AI_KEY_SOURCE_REQUIRED'
    );
    assert.throws(
        () => extractTeacherContext({
            headers: {
                'x-teacher-name': 'Ms Ada',
                'x-ai-key-source': 'teacher'
            },
            body: {}
        }, {}),
        error => error.code === 'TEACHER_AI_KEY_REQUIRED'
    );
});

test('sanitizes teacher names and never accepts arrays as headers', () => {
    assert.throws(
        () => extractTeacherContext({
            headers: {
                'x-teacher-name': ['Ms Ada'],
                'x-ai-key-source': 'platform'
            },
            body: {}
        }, { geminiApiKey: 'platform-secret-key-123' }),
        /Teacher name/
    );
    assert.throws(
        () => extractTeacherContext({
            headers: {
                'x-teacher-name': '<script>'.repeat(30),
                'x-ai-key-source': 'platform'
            },
            body: {}
        }, { geminiApiKey: 'platform-secret-key-123' }),
        /120 characters/
    );
});

