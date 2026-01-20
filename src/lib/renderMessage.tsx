"use client";

import React from "react";
import {
  ConceptCard,
  ListCard,
  QuoteCard,
  ExampleCard,
  Box as FormulaCard,
} from "@/components/MessageBlocks";
import { LatexRenderer } from "@/lib/latex-renderer";
import { parseFormulaContent } from "@/lib/formula-utils";

type FormulaBlockProps = {
  title?: string;
  content: string;
  isExample?: boolean;
  rtl: boolean;
  indexKey: string;
};

function FormulaBlock({
  title,
  content,
  isExample,
  rtl,
  indexKey,
}: FormulaBlockProps) {
  const { formulaText, formulaHtml, metaItems } = parseFormulaContent(content);
  const hasHtmlFormula = Boolean(formulaHtml);

  return (
    <div
      key={indexKey}
      dir={rtl ? "rtl" : "ltr"}
      className="relative my-6 overflow-hidden rounded-[26px] border border-emerald-500/25 bg-[#030b05] px-0 pb-0 pt-0 text-sm text-emerald-100 shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
    >
      <div className="flex items-center justify-between border-b border-emerald-500/15 px-6 py-4 text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-emerald-300/90 shadow-[0_0_12px_rgba(16,185,129,0.65)]" />
            <span className="inline-block size-1.5 rounded-full bg-emerald-500/60" />
          </span>
          <span className="font-semibold tracking-[0.35em]">
            {isExample ? "مثال" : "قانون"}
          </span>
        </div>
        <div className="text-[9px] tracking-[0.5em] text-emerald-200/70">
          {(title || (rtl ? "معادلة / قانون" : "FORMULA / CODE SNIPPET"))?.toUpperCase()}
        </div>
      </div>

      <div className="px-6 pb-6 pt-7">
        <div className="text-center">
          <div
            className="text-2xl md:text-3xl font-semibold tracking-wide text-transparent bg-gradient-to-r from-emerald-200 via-emerald-50 to-emerald-300 bg-clip-text font-['JetBrains_Mono',monospace]"
            dir="ltr"
            {...(hasHtmlFormula
              ? { dangerouslySetInnerHTML: { __html: formulaHtml! } }
              : { children: formulaText })}
          />
          <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
        </div>

        {metaItems.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 text-xs text-emerald-200/80 sm:grid-cols-2">
            {metaItems.map((item, idx) => (
              <div
                key={`${indexKey}-meta-${idx}`}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-md"
              >
                <span className="text-[11px] font-medium tracking-wide text-emerald-100/80">
                  {item.label}
                </span>
                {item.symbol && (
                  <span className="text-base font-semibold text-emerald-300">
                    {item.symbol}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function renderMessage(text: string) {
  let cleanText = text
    .replace(/\*\*\[card\]/gi, "[card]")
    .replace(/\[card\]\*\*/gi, "[card]")
    .replace(/\*\*\[\/card\]/gi, "[/card]")
    .replace(/\[\/card\]\*\*/gi, "[/card]")
    .replace(/\*\*\[box\]/gi, "[box]")
    .replace(/\[box\]\*\*/gi, "[box]")
    .replace(/\*\*\[\/box\]/gi, "[/box]")
    .replace(/\[\/box\]\*\*/gi, "[/box]")
    .replace(/\*\*\[concept\]/gi, "[concept]")
    .replace(/\[concept\]\*\*/gi, "[concept]")
    .replace(/\*\*\[\/concept\]/gi, "[/concept]")
    .replace(/\[\/concept\]\*\*/gi, "[/concept]")
    .replace(/\*\*\[list\]/gi, "[list]")
    .replace(/\[list\]\*\*/gi, "[list]")
    .replace(/\*\*\[\/list\]/gi, "[/list]")
    .replace(/\[\/list\]\*\*/gi, "[/list]")
    .replace(/\*\*\[quote\]/gi, "[quote]")
    .replace(/\[quote\]\*\*/gi, "[quote]")
    .replace(/\*\*\[\/quote\]/gi, "[/quote]")
    .replace(/\[\/quote\]\*\*/gi, "[/quote]")
    .replace(/\*\*\[example\]/gi, "[example]")
    .replace(/\[example\]\*\*/gi, "[example]")
    .replace(/\*\*\[\/example\]/gi, "[/example]")
    .replace(/\[\/example\]\*\*/gi, "[/example]")
    .replace(/\*\*\[analysis\]/gi, "[analysis]")
    .replace(/\[analysis\]\*\*/gi, "[analysis]")
    .replace(/\*\*\[\/analysis\]/gi, "[analysis]")
    .replace(/\[\/analysis\]\*\*/gi, "[analysis]")
    .replace(/\*\*\[poetry\]/gi, "[poetry]")
    .replace(/\[poetry\]\*\*/gi, "[poetry]")
    .replace(/\*\*\[\/poetry\]/gi, "[/poetry]")
    .replace(/\[\/poetry\]\*\*/gi, "[/poetry]")
    .replace(/\*\*\[process\]/gi, "[process]")
    .replace(/\[process\]\*\*/gi, "[process]")
    .replace(/\*\*\[\/process\]/gi, "[/process]")
    .replace(/\[\/process\]\*\*/gi, "[/process]")
    .replace(/\*\*/g, "");

  const parts = cleanText.split(
    /(\[concept\][\s\S]*?(?:\[\/concept\]|$)|\[card\][\s\S]*?(?:\[\/card\]|$)|\[box\][\s\S]*?(?:\[\/box\]|$)|\[list\][\s\S]*?(?:\[\/list\]|$)|\[quote\][\s\S]*?(?:\[\/quote\]|$)|\[example\][\s\S]*?(?:\[\/example\]|$)|\[analysis\][\s\S]*?(?:\[\/analysis\]|$)|\[poetry\][\s\S]*?(?:\[\/poetry\]|$)|\[process\][\s\S]*?(?:\[\/process\]|$)|\[METADATA:[\s\S]*?\])/i
  );

  const messageIsArabic = isArabic(cleanText);
  const orderedBlocks: React.ReactNode[] = [];
  const toc: { title: string; slug: string }[] = [];

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^a-z0-9\-\u0600-\u06FF]/g, "");

  const buildTextBlock = (partText: string, i: number, prefix: string) => {
    const lines = partText.split("\n").map((l) => l.replace(/\r/g, ""));
    const elements: React.ReactNode[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      elements.push(
        <div
          key={`${prefix}-buf-${i}-${elements.length}`}
          className="my-3"
        >
          {renderContent(buffer.join("\n"), messageIsArabic)}
        </div>
      );
      buffer = [];
    };

    lines.forEach((line) => {
      if (
        /^\s*(مثال تطبيقي|مثال|القانون الرياضي|التعريف النصي)\s*$/i.test(line)
      ) {
        flushBuffer();
        const chipText = line.trim();
        elements.push(
          <div
            key={`${prefix}-chip-${i}-${elements.length}`}
            className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary text-background-dark mb-3"
          >
            {chipText}
          </div>
        );
        return;
      }

      if (/^#{1,2}\s+/.test(line)) {
        flushBuffer();
        const titleText = line.replace(/^#{1,2}\s+/, "").trim();
        const slug = slugify(titleText);
        toc.push({ title: titleText, slug });
        elements.push(
          <h2
            key={`${prefix}-title-${i}-${elements.length}`}
            className="text-xl md:text-2xl font-semibold text-primary tracking-wide border-b border-primary/25 pb-2 mb-4"
            dir={messageIsArabic ? "rtl" : "ltr"}
            id={slug}
          >
            {titleText}
          </h2>
        );
      } else {
        buffer.push(line);
      }
    });

    flushBuffer();

    if (elements.length === 0) return null;

    return (
      <div
        key={`${prefix}-block-${i}`}
        dir={messageIsArabic ? "rtl" : "ltr"}
        className="my-4 text-gray-200 leading-relaxed text-sm md:text-base"
      >
        {elements}
      </div>
    );
  };

  parts.forEach((part, i) => {
    if (!part || !part.trim()) return;

    const lower = part.toLowerCase();

    if (lower.startsWith("[concept]")) {
      let content = part.replace(/\[\/?concept\]/gi, "").trim();
      const colonIdx = content.indexOf(":");
      const title =
        colonIdx > 0 ? content.slice(0, colonIdx).trim() : undefined;
      const body = colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content;
      const slug = title ? slugify(title) : undefined;
      if (title && slug) toc.push({ title, slug });

      orderedBlocks.push(
        <div key={`concept-${i}`} id={slug}>
          <ConceptCard title={title}>
            {body}
          </ConceptCard>
        </div>
      );
      return;
    }

    // renderMessage.tsx - جزء معالجة [box] المحسّن

    // استبدل هذا الجزء في renderMessage.tsx:

    if (lower.startsWith("[box]")) {
      let content = part.replace(/\[\/?box\]/gi, "").trim();
      let isExampleBox = false;

      // تحقق من كلمة "مثال" في البداية
      content = content.replace(/^\s*مثال\s*[:\-]?\s*/i, () => {
        isExampleBox = true;
        return "";
      });

      // 🔥 الحل: لا تستخرج title من المحتوى!
      // المعادلة يجب أن تبدأ مباشرة بدون عنوان

      // إذا كان هناك ":" قبل أول "|" فهذا خطأ - تجاهله
      const firstPipe = content.indexOf("|");
      if (firstPipe > 0) {
        const beforePipe = content.substring(0, firstPipe);
        // إذا كان هناك ":" في الجزء قبل أول "|" وليس جزء من المعادلة
        const colonIdx = beforePipe.indexOf(":");
        if (colonIdx > 0 && !beforePipe.includes("=")) {
          // هذا عنوان خاطئ - احذفه
          content = content.substring(colonIdx + 1).trim();
        }
      }

      orderedBlocks.push(
        <FormulaCard
          key={`box-formula-${i}`}
          title={undefined} // لا نستخدم title من المحتوى
          isExample={isExampleBox}
        >
          {content}
        </FormulaCard>
      );
      return;
    }


    if (lower.startsWith("[list]")) {
      let content = part.replace(/\[\/?list\]/gi, "").trim();
      const colonIdx = content.indexOf(":");
      const title =
        colonIdx > 0 ? content.slice(0, colonIdx).trim() : undefined;
      const body = colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content;
      const points = body
        .split(/[؛;]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const slug = title ? slugify(title) : undefined;
      if (title && slug) toc.push({ title, slug });
      orderedBlocks.push(
        <div key={`list-${i}`} id={slug}>
          <ListCard title={title} points={points} />
        </div>
      );
      return;
    }

    if (lower.startsWith("[quote]")) {
      let content = part.replace(/\[\/?quote\]/gi, "").trim();
      let source: string | undefined;  // ⬅️ معرّف هنا

      if (content.includes("---")) {
        const quoteParts = content.split("---");
        content = quoteParts[0].trim();
        source = quoteParts[1]?.trim();  // ⬅️ بياخد قيمة هنا
      }

      orderedBlocks.push(
        <QuoteCard key={`quote-${i}`} source={source}>
          {content}
        </QuoteCard>
      );
      return;
    }

    if (lower.startsWith("[example]")) {
      const content = part.replace(/\[\/?example\]/gi, "").trim();

      orderedBlocks.push(
        <ExampleCard key={`example-${i}`}>
          {content}
        </ExampleCard>
      );
      return;
    }

    if (lower.startsWith("[analysis]")) {
      let content = part.replace(/\[\/?analysis\]/gi, "").trim();
      const colonIdx = content.indexOf(":");
      const title =
        colonIdx > 0 ? content.slice(0, colonIdx).trim() : undefined;
      const body = colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content;
      let blockText = body;
      if (title) {
        blockText = `## ${title}\n\n${body}`;
      }
      const block = buildTextBlock(blockText, i, "analysis");
      if (block) {
        orderedBlocks.push(block);
      }
      return;
    }

    if (lower.startsWith("[poetry]")) {
      let content = part.replace(/\[\/?poetry\]/gi, "").trim();
      const block = buildTextBlock(content, i, "poetry");
      if (block) {
        orderedBlocks.push(block);
      }
      return;
    }

    if (lower.startsWith("[process]")) {
      let content = part.replace(/\[\/?process\]/gi, "").trim();
      const colonIdx = content.indexOf(":");
      const title =
        colonIdx > 0 ? content.slice(0, colonIdx).trim() : undefined;
      const body = colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content;
      let blockText = body;
      if (title) {
        blockText = `## ${title}\n\n${body}`;
      }
      const block = buildTextBlock(blockText, i, "process");
      if (block) {
        orderedBlocks.push(block);
      }
      return;
    }

    if (lower.startsWith("[card]")) {
      let content = part.replace(/\[\/?card\]/gi, "").trim();
      let isExampleCard = false;
      content = content.replace(/^\s*مثال\s*[:\-]?\s*/i, () => {
        isExampleCard = true;
        return "";
      });
      const colonIdx = content.indexOf(":");
      const rawTitle = colonIdx > 0 ? content.slice(0, colonIdx).trim() : null;
      const body = colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content;
      let blockText = body;
      if (rawTitle) {
        blockText = `## ${rawTitle}\n\n${body}`;
      } else if (isExampleCard) {
        blockText = `## مثال\n\n${body}`;
      }
      const block = buildTextBlock(blockText, i, "card");
      if (block) {
        orderedBlocks.push(block);
      }
      return;
    }

    if (part.startsWith("[METADATA")) {
      return;
    }

    const block = buildTextBlock(part, i, "text");
    if (block) {
      orderedBlocks.push(block);
    }
  });

  if (toc.length >= 2) {
    orderedBlocks.unshift(
      <div
        key={`toc-block`}
        dir={messageIsArabic ? "rtl" : "ltr"}
        className="mb-4"
      >
        <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-300/90">
          {toc.map((t) => (
            <a
              key={`toc-${t.slug}`}
              href={`#${t.slug}`}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
            >
              {t.title}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto">
      {orderedBlocks}
    </div>
  );
}

function isArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

function renderContent(text: string, forceRTL?: boolean) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const rtl = Boolean(forceRTL || isArabic(text));
  const headingPattern = /^(.+?)\s*[:：]\s*$/;
  const definitionPattern = /^(.+?)\s*[:：]\s+(.+)$/;

  return lines.map((p, idx) => (
    (() => {
      const headingMatch = p.match(headingPattern);
      if (headingMatch && headingMatch[1]?.length <= 60) {
        return (
          <div
            key={`heading-${idx}`}
            className="mt-5 mb-2 text-[1.05rem] md:text-[1.2rem] font-bold text-white tracking-wide border-b border-white/10 pb-1"
            dir={rtl ? "rtl" : "ltr"}
          >
            {headingMatch[1]}
          </div>
        );
      }

      const definitionMatch = p.match(definitionPattern);
      if (definitionMatch) {
        const label = definitionMatch[1]?.trim() || "";
        const detail = definitionMatch[2]?.trim() || "";
        const looksStructured =
          label.length > 0 &&
          label.length <= 48 &&
          detail.length > 0 &&
          !/^https?:\/\//i.test(detail);

        if (looksStructured) {
          return (
            <div
              key={`definition-${idx}`}
              className="my-3 rounded-2xl border border-white/10 bg-white/5/40 px-4 py-3 backdrop-blur-md"
              dir={rtl ? "rtl" : "ltr"}
            >
              <div className="text-[11px] uppercase tracking-[0.4em] text-white/60">
                {label}
              </div>
              <div className="mt-1 text-[15px] leading-7 text-gray-50">
                {renderInline(detail)}
              </div>
            </div>
          );
        }
      }

      return (
        <p
          key={`paragraph-${idx}`}
          className="text-gray-100 leading-8 text-[15px] md:text-[17px]"
          dir={rtl ? "rtl" : "ltr"}
        >
          {renderInline(p)}
        </p>
      );
    })()
  ));
}

function renderInline(text: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  const regex = /\[gloss\]([\s\S]*?)\[\/gloss\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  const nextKey = () => `segment-${keyIndex++}`;

  const pushLatexText = (slice: string) => {
    if (!slice) return;
    segments.push(
      <LatexRenderer key={nextKey()} content={slice} as="span" />
    );
  };

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushLatexText(text.slice(lastIndex, match.index));
    }

    const inner = match[1] || "";
    const ci = inner.indexOf(":");
    const term = ci > 0 ? inner.slice(0, ci).trim() : inner.trim();
    const def = ci > 0 ? inner.slice(ci + 1).trim() : "";
    segments.push(
      <span
        key={nextKey()}
        title={def}
        className="underline decoration-dotted decoration-2 underline-offset-2 cursor-help"
      >
        {term}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    pushLatexText(text.slice(lastIndex));
  }

  if (segments.length === 0) {
    return [
      <LatexRenderer key={nextKey()} content={text} as="span" />,
    ];
  }

  return segments;
}
