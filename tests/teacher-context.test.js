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
            'x-gemini-api-key': 'teacher-secret-key-123'
        },
        body: {}
    });

    assert.deepEqual(context, {
        teacherDisplayName: 'Ms Ada',
        keySource: 'teacher',
        apiKey: 'teacher-secret-key-123',
        teacherKeyUsed: true
    });
});

test('defaults missing teacher name and key to Teacher and platform pool', () => {
    const context = extractTeacherContext({ headers: {}, body: {} });
    assert.deepEqual(context, {
        teacherDisplayName: 'Teacher',
        keySource: 'platform',
        apiKey: null,
        teacherKeyUsed: false
    });
});

test('sanitizes teacher names and never accepts arrays as headers', () => {
    assert.throws(
        () => extractTeacherContext({
            headers: {
                'x-teacher-name': ['Ms Ada'],
                'x-gemini-api-key': 'teacher-secret-key-123'
            },
            body: {}
        }),
        /Teacher name/
    );
    assert.throws(
        () => extractTeacherContext({
            headers: {
                'x-teacher-name': '<script>'.repeat(30),
                'x-gemini-api-key': 'teacher-secret-key-123'
            },
            body: {}
        }),
        /120 characters/
    );
});

