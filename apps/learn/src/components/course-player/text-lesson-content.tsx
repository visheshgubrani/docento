import { useMemo } from "react";

import { sanitizeLessonHtml } from "@/lib/sanitize-html";

type TipTapMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
  content?: TipTapNode[];
};

type TextLessonContentProps = {
  content?: string | null;
  fallback?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNode(value: unknown): TipTapNode | null {
  if (!isRecord(value)) return null;

  return {
    type: typeof value.type === "string" ? value.type : undefined,
    text: typeof value.text === "string" ? value.text : undefined,
    attrs: isRecord(value.attrs) ? value.attrs : undefined,
    marks: Array.isArray(value.marks)
      ? value.marks
          .map((mark) => (isRecord(mark) ? (mark as TipTapMark) : null))
          .filter((mark): mark is TipTapMark => Boolean(mark))
      : undefined,
    content: Array.isArray(value.content)
      ? value.content
          .map((child) => asNode(child))
          .filter((child): child is TipTapNode => Boolean(child))
      : undefined,
  };
}

function parseTipTapContent(content?: string | null): TipTapNode | null {
  if (!content?.trim()) return null;

  try {
    const parsed = JSON.parse(content) as unknown;
    const node = asNode(parsed);
    if (node) return node;
  } catch {
    // Content may be HTML or plain text in legacy lessons.
  }

  return null;
}

function unwrapJsonString(value: string) {
  let next = value.trim();

  // Handle cases like "\"<p>...</p>\"" or double-encoded JSON strings.
  for (let index = 0; index < 2; index += 1) {
    try {
      const parsed = JSON.parse(next) as unknown;
      if (typeof parsed === "string") {
        next = parsed.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }

  return next;
}

function decodeBasicEntities(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStringAttr(attrs: Record<string, unknown> | undefined, key: string) {
  const value = attrs?.[key];
  return typeof value === "string" ? value : undefined;
}

function sanitizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return trimmed;
    }
  } catch {
    return "";
  }

  return "";
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}


function applyMarks(text: string, marks: TipTapMark[] | undefined): string {
  if (!marks?.length) return text;

  return marks.reduce((acc, mark) => {
    const type = mark.type?.toLowerCase();

    if (type === "bold") return `<strong>${acc}</strong>`;
    if (type === "italic") return `<em>${acc}</em>`;
    if (type === "underline") return `<u>${acc}</u>`;
    if (type === "strike") return `<s>${acc}</s>`;
    if (type === "code") return `<code>${acc}</code>`;
    if (type === "superscript") return `<sup>${acc}</sup>`;
    if (type === "subscript") return `<sub>${acc}</sub>`;
    if (type === "highlight") return `<mark>${acc}</mark>`;

    if (type === "link") {
      const href = getStringAttr(mark.attrs, "href");
      const safeHref = href ? sanitizeUrl(href) : "";
      if (!safeHref) return acc;
      return `<a href="${escapeHtml(
        safeHref
      )}" target="_blank" rel="noopener noreferrer">${acc}</a>`;
    }

    return acc;
  }, text);
}

function serializeChildren(content: TipTapNode[] | undefined): string {
  if (!content?.length) return "";
  return content.map((child) => serializeNode(child)).join("");
}

function serializeNode(node: TipTapNode): string {
  const type = node.type?.toLowerCase();
  const children = serializeChildren(node.content);

  if (type === "doc") return children;
  if (type === "text") return applyMarks(escapeHtml(node.text ?? ""), node.marks);
  if (type === "hardbreak") return "<br />";
  if (type === "horizontalrule") return "<hr />";

  if (type === "paragraph") return `<p>${children}</p>`;

  if (type === "heading") {
    const levelRaw = node.attrs?.level;
    const level = typeof levelRaw === "number" ? Math.max(1, Math.min(6, levelRaw)) : 2;
    return `<h${level}>${children}</h${level}>`;
  }

  if (type === "bulletlist") return `<ul>${children}</ul>`;
  if (type === "orderedlist") {
    const startRaw = node.attrs?.start;
    const startAttr = typeof startRaw === "number" && startRaw > 1 ? ` start="${startRaw}"` : "";
    return `<ol${startAttr}>${children}</ol>`;
  }
  if (type === "listitem") return `<li>${children}</li>`;

  if (type === "tasklist") return `<ul>${children}</ul>`;
  if (type === "taskitem") {
    const checked = Boolean(node.attrs?.checked);
    const checkedAttr = checked ? " checked" : "";
    return `<li><input type="checkbox" disabled${checkedAttr} /> ${children}</li>`;
  }

  if (type === "blockquote") return `<blockquote>${children}</blockquote>`;

  if (type === "codeblock") {
    return `<pre><code>${children}</code></pre>`;
  }

  if (type === "image") {
    const src = getStringAttr(node.attrs, "src");
    const safeSrc = src ? sanitizeUrl(src) : "";
    if (!safeSrc) return "";

    const alt = escapeHtml(getStringAttr(node.attrs, "alt") ?? "Lesson image");
    return `<img src="${escapeHtml(safeSrc)}" alt="${alt}" loading="lazy" />`;
  }

  return children;
}

export function TextLessonContent({ content, fallback }: TextLessonContentProps) {
  const parsed = useMemo(() => parseTipTapContent(content), [content]);
  const html = useMemo(() => (parsed ? serializeNode(parsed) : ""), [parsed]);
  const normalizedContent = useMemo(() => {
    const raw = content?.trim() ?? "";
    if (!raw) return "";
    return decodeBasicEntities(unwrapJsonString(raw));
  }, [content]);

  const legacyHtml = useMemo(() => {
    if (!normalizedContent || parsed || !looksLikeHtml(normalizedContent)) return "";
    return sanitizeLessonHtml(normalizedContent);
  }, [normalizedContent, parsed]);

  if (parsed) return <article dangerouslySetInnerHTML={{ __html: html }} />;
  if (legacyHtml) return <article dangerouslySetInnerHTML={{ __html: legacyHtml }} />;

  if (normalizedContent) return <p>{normalizedContent}</p>;
  if (!fallback?.trim()) return null;
  return <p>{fallback}</p>;
}
