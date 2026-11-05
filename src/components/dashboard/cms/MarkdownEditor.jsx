// src/components/dashboard/cms/MarkdownEditor.jsx
import React, { useState } from 'react';
import { Eye, Edit3, Bold, Italic, List, Heading, Link as LinkIcon, Code } from 'lucide-react';

/**
 * Validates URLs to permit only safe schemes (http, https, mailto, tel, or relative/fragment).
 * Disallows javascript:, data:, vbscript:, and control/quote injection.
 */
export function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject whitespace, quotes, angle brackets, or control characters
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 32 || code === 127 || code === 34 || code === 39 || code === 60 || code === 62) {
      return false;
    }
  }

  // Reject dangerous schemes
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }

  // Only allow http, https, mailto, tel, or relative/anchor paths
  return /^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed);
}

/**
 * Safely parses inline markdown (bold, italic, inline code, and links)
 * into safe React nodes without using dangerouslySetInnerHTML.
 * Any raw HTML tags or script injection are treated strictly as text.
 */
export function safeParseInline(text, keyPrefix = 'inline') {
  if (!text) return null;

  const tokens = [];
  let remaining = text;
  let index = 0;

  // Match the earliest token: inline code, link, bold, or italic
  const pattern = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/;

  while (remaining) {
    const match = remaining.match(pattern);
    if (!match) {
      tokens.push(remaining);
      break;
    }

    const matchStart = match.index;
    const matchText = match[0];

    // Append preceding plain text
    if (matchStart > 0) {
      tokens.push(remaining.slice(0, matchStart));
    }

    const key = `${keyPrefix}-${index++}`;

    if (matchText.startsWith('`') && matchText.endsWith('`')) {
      const codeContent = matchText.slice(1, -1);
      tokens.push(
        <code
          key={key}
          style={{
            background: 'rgba(255,184,0,0.15)',
            color: '#ffd54f',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}
        >
          {codeContent}
        </code>
      );
    } else if (matchText.startsWith('[') && matchText.endsWith(')')) {
      const linkMatch = matchText.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, linkLabel, rawUrl] = linkMatch;
        if (isSafeUrl(rawUrl)) {
          tokens.push(
            <a
              key={key}
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffd54f', textDecoration: 'underline' }}
            >
              {safeParseInline(linkLabel, `${key}-lbl`)}
            </a>
          );
        } else {
          // If unsafe scheme (e.g. javascript:), render safely as plain text
          tokens.push(
            <span key={key} style={{ color: '#e0e0ec' }}>
              {linkLabel}
            </span>
          );
        }
      } else {
        tokens.push(matchText);
      }
    } else if (matchText.startsWith('**') && matchText.endsWith('**')) {
      const boldContent = matchText.slice(2, -2);
      tokens.push(
        <strong key={key} style={{ fontWeight: 800, color: '#fff' }}>
          {safeParseInline(boldContent, `${key}-b`)}
        </strong>
      );
    } else if (
      (matchText.startsWith('*') && matchText.endsWith('*')) ||
      (matchText.startsWith('_') && matchText.endsWith('_'))
    ) {
      const italicContent = matchText.slice(1, -1);
      tokens.push(
        <em key={key} style={{ fontStyle: 'italic', color: '#ffd54f' }}>
          {safeParseInline(italicContent, `${key}-i`)}
        </em>
      );
    } else {
      tokens.push(matchText);
    }

    remaining = remaining.slice(matchStart + matchText.length);
  }

  return tokens.length === 1 && typeof tokens[0] === 'string' ? tokens[0] : tokens;
}

/**
 * Renders block-level markdown into React elements safely.
 */
export function renderMarkdown(md) {
  if (!md) return <p style={{ color: '#888', fontStyle: 'italic' }}>لا يوجد محتوى للعرض.</p>;

  const lines = md.split('\n');
  const elements = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          style={{
            paddingInlineStart: '1.5rem',
            marginBottom: '1rem',
            color: '#e0e0ec',
            lineHeight: 1.8,
          }}
        >
          {listBuffer.map((item, i) => (
            <li key={i}>{safeParseInline(item, `li-${elements.length}-${i}`)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
      return;
    } else {
      flushList();
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={idx}
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#ffd54f',
            margin: '1.5rem 0 0.5rem',
          }}
        >
          {safeParseInline(trimmed.slice(4), `h3-${idx}`)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={idx}
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#fff',
            margin: '1.75rem 0 0.75rem',
          }}
        >
          {safeParseInline(trimmed.slice(3), `h2-${idx}`)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={idx}
          style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#fff',
            margin: '2rem 0 1rem',
          }}
        >
          {safeParseInline(trimmed.slice(2), `h1-${idx}`)}
        </h1>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={idx}
          style={{
            borderInlineStart: '4px solid #ffb800',
            background: 'rgba(255, 184, 0, 0.05)',
            padding: '0.75rem 1rem',
            margin: '1rem 0',
            borderRadius: '0 8px 8px 0',
            color: '#d0d0df',
            fontStyle: 'italic',
          }}
        >
          {safeParseInline(trimmed.slice(2), `quote-${idx}`)}
        </blockquote>
      );
    } else if (trimmed === '') {
      // blank line
    } else {
      elements.push(
        <p
          key={idx}
          style={{
            color: '#d0d0df',
            fontSize: '0.98rem',
            lineHeight: 1.8,
            marginBottom: '0.85rem',
          }}
        >
          {safeParseInline(trimmed, `p-${idx}`)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

export default function MarkdownEditor({ value = '', onChange, placeholder = '', dir = 'rtl' }) {
  const [view, setView] = useState('edit'); // 'edit' | 'preview'

  function insertFormatting(prefix, suffix = '') {
    const textarea = document.getElementById('cms-markdown-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'نص';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  }

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(255, 184, 0, 0.25)',
        background: 'rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
      }}
    >
      {/* Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => insertFormatting('**', '**')}
            title="غامق (Bold)"
            style={toolBtnStyle}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*')}
            title="مائل (Italic)"
            style={toolBtnStyle}
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('## ')}
            title="عنوان رئيسي (Heading)"
            style={toolBtnStyle}
          >
            <Heading size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- ')}
            title="قائمة نقطية (List)"
            style={toolBtnStyle}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('> ')}
            title="اقتباس (Quote)"
            style={toolBtnStyle}
          >
            <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>”</span>
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`')}
            title="رمز برمجي (Code)"
            style={toolBtnStyle}
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('[', '](https://)')}
            title="رابط (Link)"
            style={toolBtnStyle}
          >
            <LinkIcon size={15} />
          </button>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setView('edit')}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: view === 'edit' ? '#ffb800' : 'transparent',
              color: view === 'edit' ? '#000' : '#aaa',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Edit3 size={13} />
            <span>تحرير</span>
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: view === 'preview' ? '#ffb800' : 'transparent',
              color: view === 'preview' ? '#000' : '#aaa',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Eye size={13} />
            <span>معاينة فورية</span>
          </button>
        </div>
      </div>

      {/* Editor or Preview Pane */}
      {view === 'edit' ? (
        <textarea
          id="cms-markdown-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'اكتب المحتوى بصيغة Markdown هنا...'}
          dir={dir}
          rows={14}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: dir === 'ltr' ? 'inherit' : 'var(--font-cairo, sans-serif)',
          }}
        />
      ) : (
        <div
          dir={dir}
          style={{
            padding: '1.25rem',
            minHeight: '280px',
            maxHeight: '480px',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {renderMarkdown(value)}
        </div>
      )}
    </div>
  );
}

const toolBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#ffd54f',
  padding: '5px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};


