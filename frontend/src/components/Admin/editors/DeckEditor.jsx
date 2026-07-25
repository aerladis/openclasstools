import React, { useEffect, useState } from 'react';
import { EDITOR_CONFIG, fieldsFor, newEntryFor } from './editor-config';
import styles from './DeckEditor.module.css';

export default function DeckEditor({ gameType, content, busy, onPublish, onCancel }) {
  const [entries, setEntries] = useState(content);

  useEffect(() => setEntries(structuredClone(content)), [content]);

  const update = (index, key, value) => {
    setEntries((current) => current.map((entry, i) => {
      if (i !== index) return entry;
      if (EDITOR_CONFIG[gameType]?.stringEntries) return value;
      return { ...entry, [key]: value };
    }));
  };

  const updateFixedList = (entryIndex, key, itemIndex, value) => {
    setEntries((current) => current.map((entry, index) => {
      if (index !== entryIndex) return entry;
      const next = [...entry[key]];
      next[itemIndex] = value;
      return { ...entry, [key]: next };
    }));
  };

  return (
    <div className={styles.editor}>
      <div className={styles.entries}>
        {entries.map((entry, index) => (
          <article key={`${index}-${typeof entry === 'string' ? entry : entry.type || entry.word || entry.color}`}>
            <span>#{index + 1}</span>
            {EDITOR_CONFIG[gameType]?.stringEntries ? (
              <input value={entry} onChange={(event) => update(index, null, event.target.value)} />
            ) : fieldsFor(gameType, entry).map((field) => (
              <label key={field.key}>
                {field.label}
                {field.boolean ? (
                  <select
                    value={String(entry[field.key])}
                    onChange={(event) => update(index, field.key, event.target.value === 'true')}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : field.fixedList ? (
                  <span className={styles.fixedList}>
                    {Array.from({ length: field.fixedList }, (_, itemIndex) => (
                      <input
                        key={itemIndex}
                        value={entry[field.key]?.[itemIndex] || ''}
                        aria-label={`${field.label} ${itemIndex + 1}`}
                        onChange={(event) => updateFixedList(
                          index,
                          field.key,
                          itemIndex,
                          event.target.value,
                        )}
                      />
                    ))}
                  </span>
                ) : field.optionIndex ? (
                  <select
                    value={entry[field.key]}
                    onChange={(event) => update(index, field.key, Number(event.target.value))}
                  >
                    {(entry.options || []).map((option, optionIndex) => (
                      <option key={optionIndex} value={optionIndex}>
                        {optionIndex + 1}. {option || `Option ${optionIndex + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.number ? 'number' : 'text'}
                    readOnly={field.readOnly}
                    value={field.list ? (entry[field.key] || []).join(', ') : (entry[field.key] ?? '')}
                    onChange={(event) => update(
                      index,
                      field.key,
                      field.list
                        ? event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                        : field.number ? Number(event.target.value) : event.target.value,
                    )}
                  />
                )}
              </label>
            ))}
            {gameType !== 'hats' && (
              <button type="button" onClick={() => setEntries(entries.filter((_, i) => i !== index))}>
                Remove
              </button>
            )}
          </article>
        ))}
      </div>
      {gameType !== 'hats' && (
        <button type="button" onClick={() => setEntries([...entries, newEntryFor(gameType)])}>
          Add entry
        </button>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={busy} onClick={() => onPublish(entries)}>
          Publish new version
        </button>
      </div>
    </div>
  );
}
