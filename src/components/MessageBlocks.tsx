"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Hash,
  Lightbulb,
  Edit,
  FileText,
  List,
  Quote,
  Sparkles,
  PenTool,
  Settings,
  PlayCircle,
  ChevronDown,
  Sigma,
} from "lucide-react";
import { parseFormulaContent } from "@/lib/formula-utils";
import { LatexRenderer } from "@/lib/latex-renderer";

// ============================================================
// 1. ConceptCard - كرت المفهوم الأساسي
// ============================================================
export function ConceptCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content);
  const cardTitle = title || "المفهوم الأساسي";
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div
      className="h-full bg-gradient-to-br from-primary/5 via-card/95 to-card border border-primary/20 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group cursor-pointer"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-foreground font-semibold text-sm tracking-wide">
            {cardTitle}
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-5 flex-1 flex items-center">
          <LatexRenderer
            content={content}
            as="p"
            className="text-foreground/85 text-base leading-relaxed font-normal"
            dir={isArabic ? "rtl" : "ltr"}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2. ListCard - كرت النقاط الجوهرية
// ============================================================
export function ListCard({
  children,
  title,
  points,
}: {
  children?: React.ReactNode;
  title?: string;
  points?: string[];
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content + (title || ""));
  const cardTitle = title || "نقاط جوهرية";
  const [isOpen, setIsOpen] = React.useState(true);

  let parsedPoints = points || [];
  if (!points && content) {
    parsedPoints = content
      .split(/[؛;]/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-primary/5 via-card/95 to-card border border-primary/20 rounded-xl overflow-hidden shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group cursor-pointer"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-foreground font-semibold text-sm tracking-wide">
            {cardTitle}
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-4 flex-1">
          <ul className="space-y-2.5">
            {parsedPoints.map((point, idx) => (
              <li
                key={idx}
                className="flex gap-3 text-sm text-foreground/80 group/item hover:text-foreground transition-colors"
              >
                <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_hsl(var(--primary)/0.6)] group-hover/item:shadow-[0_0_12px_hsl(var(--primary)/1)] group-hover/item:scale-125 transition-all duration-300"></span>
                <span className="leading-relaxed flex-1">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3. QuoteCard - كرت السياق/الاقتباس
// ============================================================
export function QuoteCard({
  children,
  source,
}: {
  children: React.ReactNode;
  source?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content);
  const [isOpen, setIsOpen] = React.useState(true);

  let quote = content;
  let parsedSource = source;
  if (content.includes("---")) {
    const parts = content.split("---");
    quote = parts[0].trim();
    parsedSource = parsedSource || parts[1]?.trim();
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-primary/5 via-card/95 to-card border border-primary/20 rounded-xl overflow-hidden shadow-sm relative group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="absolute top-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <Quote
          className={`w-12 h-12 text-primary ${isArabic ? "left-2" : "right-2"
            }`}
        />
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-foreground font-semibold text-sm tracking-wide">
            💡 سياق مهم
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-4 relative z-10 flex flex-col justify-center">
          <blockquote className="text-center">
            <p className="text-foreground/85 font-medium italic text-sm leading-relaxed mb-3">
              "{quote}"
            </p>
            {parsedSource && (
              <footer className="text-primary/80 text-xs font-semibold flex items-center justify-center gap-2">
                <span className="w-6 h-px bg-gradient-to-r from-transparent to-primary/50"></span>
                {parsedSource}
                <span className="w-6 h-px bg-gradient-to-l from-transparent to-primary/50"></span>
              </footer>
            )}
          </blockquote>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 4. ExampleCard - مثال محلول
// ============================================================
export function ExampleCard({
  children,
  question,
  givens,
  steps,
  result,
}: {
  children?: React.ReactNode;
  question?: string;
  givens?: string[];
  steps?: string[];
  result?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content + (question || ""));
  const [isOpen, setIsOpen] = React.useState(true);

  let parsedQuestion = question || "";
  let parsedGivens = givens || [];
  let parsedSteps = steps || [];
  let parsedResult = result || "";

  if (!question && content) {
    const parts = content.split("|").map((p) => p.trim());
    parts.forEach((part) => {
      if (
        part.startsWith("السؤال:") ||
        part.toLowerCase().startsWith("question:")
      ) {
        parsedQuestion = part.split(":").slice(1).join(":").trim();
      } else if (
        part.startsWith("المعطيات:") ||
        part.toLowerCase().startsWith("givens:")
      ) {
        parsedGivens = part
          .split(":")
          .slice(1)
          .join(":")
          .split(/[،,]/)
          .map((g) => g.trim())
          .filter(Boolean);
      } else if (
        part.startsWith("الحل:") ||
        part.toLowerCase().startsWith("steps:")
      ) {
        parsedSteps = part
          .split(":")
          .slice(1)
          .join(":")
          .split(/[؛;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (
        part.startsWith("النتيجة:") ||
        part.toLowerCase().startsWith("result:")
      ) {
        parsedResult = part.split(":").slice(1).join(":").trim();
      }
    });
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-primary/5 via-card/95 to-card border border-primary/20 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-foreground font-semibold text-sm tracking-wide">
            ✨ مثال محلول
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
            تطبيق
          </span>
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
            aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
          >
            <ChevronDown
              className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
                }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {parsedQuestion && (
            <div>
              <h4 className="text-primary/90 text-xs font-semibold mb-2 flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary"></span>
                السؤال:
              </h4>
              <p className="text-foreground/85 text-sm leading-relaxed">
                {parsedQuestion}
              </p>
            </div>
          )}

          {parsedGivens.length > 0 && (
            <div>
              <h4 className="text-primary/90 text-xs font-semibold mb-2 flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary"></span>
                المعطيات:
              </h4>
              <div className="flex gap-2 flex-wrap">
                {parsedGivens.map((given, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary font-mono"
                  >
                    {given}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsedSteps.length > 0 && (
            <div>
              <h4 className="text-primary/90 text-xs font-semibold mb-2 flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary"></span>
                الحل:
              </h4>
              <div className="space-y-2">
                {parsedSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 size-5 rounded bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/80 text-sm leading-relaxed flex-1">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedResult && (
            <div className="pt-3 border-t border-primary/10">
              <div className="text-xs text-foreground/60 mb-1">
                النتيجة النهائية:
              </div>
              <div className="text-lg font-bold text-primary">
                {parsedResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 5. Box - التصميم النهائي النظيف
// ============================================================
export function Box({
  children,
  isExample,
  title,
}: {
  children: React.ReactNode;
  isExample?: boolean;
  title?: string;
}) {
  const rawContent = String(children || "");
  const { formulaText, formulaHtml, metaItems } = parseFormulaContent(rawContent);
  const isArabic = /[\u0600-\u06FF]/.test(rawContent);

  return (
    <div className="bg-[#151a18] border border-primary/20 rounded-xl p-6 relative overflow-hidden flex flex-col justify-center shadow-lg my-6">
      {/* خلفية pattern خفيفة */}
      <div className="absolute inset-0 bg-primary/5 opacity-30"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
            {title || "القانون الرياضي"}
          </h3>
          <span className="text-gray-600 text-2xl">Σ</span>
        </div>

        {/* المعادلة */}
        <div className="text-center py-2">
          <div className="text-4xl md:text-5xl font-bold text-white font-mono mb-4 tracking-wider" dir="ltr">
            {formulaHtml ? (
              <div dangerouslySetInnerHTML={{ __html: formulaHtml }} />
            ) : (
              formulaText
            )}
          </div>
        </div>

        {/* المتغيرات */}
        {metaItems.length > 0 && (
          <div
            className={`grid gap-2 text-center mt-2 border-t border-white/10 pt-3 ${metaItems.length === 1 ? 'grid-cols-1' :
                metaItems.length === 2 ? 'grid-cols-2' :
                  'grid-cols-3'
              }`}
          >
            {metaItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${idx > 0 && idx < metaItems.length ? 'border-l border-white/10 pl-2' : ''
                  }`}
              >
                <span className="text-primary font-mono font-bold text-lg">
                  {item.symbol}
                </span>
                <span className="text-[10px] text-gray-500" dir={isArabic ? "rtl" : "ltr"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 6. AnalysisCard - كرت التحليل (للأدب والمواد الإنسانية)
// ============================================================
export function AnalysisCard({
  children,
  title,
  elements,
  conclusion,
}: {
  children?: React.ReactNode;
  title?: string;
  elements?: { label: string; content: string }[];
  conclusion?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content + (title || ""));
  const [isOpen, setIsOpen] = React.useState(true);

  let parsedTitle = title || "التحليل";
  let parsedElements: { label: string; content: string }[] = elements || [];
  let parsedConclusion = conclusion || "";

  if (!title && content) {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    parsedElements = [];
    lines.forEach((line) => {
      if (line.includes(":")) {
        const [label, ...rest] = line.split(":");
        parsedElements.push({
          label: label.trim(),
          content: rest.join(":").trim(),
        });
      } else if (
        line.toLowerCase().startsWith("خلاصة") ||
        line.toLowerCase().startsWith("الخاتمة")
      ) {
        parsedConclusion = line
          .replace(/^(خلاصة|الخاتمة)[:\-]?\s*/i, "")
          .trim();
      }
    });
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-purple-950/10 via-card to-card border-2 border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:shadow-[0_0_40px_hsl(270,70%,50%/0.2)] transition-all duration-500 shadow-lg"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="px-6 py-4 border-b border-purple-500/20 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 transition-colors">
            <PenTool className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-foreground font-bold text-base tracking-wide">
            {parsedTitle}
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-6 space-y-4">
          {parsedElements.length > 0 && (
            <div className="space-y-4">
              {parsedElements.map((elem, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-purple-500/40 pl-4 py-2 bg-purple-500/5 rounded-r-lg"
                >
                  <div className="text-sm font-bold text-purple-300 mb-1">
                    {elem.label}
                  </div>
                  <div className="text-foreground/90 leading-relaxed">
                    {elem.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsedConclusion && (
            <div className="mt-6 pt-4 border-t border-purple-500/20">
              <div className="text-sm font-bold text-purple-300 mb-2">
                الخاتمة / الخلاصة:
              </div>
              <div className="text-foreground/90 italic leading-relaxed">
                {parsedConclusion}
              </div>
            </div>
          )}

          {children && (
            <div className="text-foreground/90 leading-relaxed mt-4">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 7. PoetryCard - كرت الشعر (للأدب العربي)
// ============================================================
export function PoetryCard({
  children,
  verse,
  meter,
  rhyme,
  analysis,
}: {
  children?: React.ReactNode;
  verse?: string;
  meter?: string;
  rhyme?: string;
  analysis?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content);
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div
      className="h-full bg-gradient-to-br from-amber-950/10 via-card to-card border-2 border-amber-500/30 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_40px_hsl(45,80%,50%/0.2)] transition-all duration-500 shadow-lg"
      dir="rtl"
    >
      <div className="px-6 py-4 border-b border-amber-500/20 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 transition-colors">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-foreground font-bold text-base tracking-wide">
            بيت شعري
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-6 space-y-4">
          {(verse || content) && (
            <div className="text-center py-6 bg-amber-500/5 rounded-xl border border-amber-500/20">
              <p className="text-2xl font-serif text-foreground leading-relaxed">
                {verse || content}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {meter && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="text-xs text-amber-300 font-bold mb-1">
                  الوزن:
                </div>
                <div className="text-sm text-foreground font-mono">
                  {meter}
                </div>
              </div>
            )}
            {rhyme && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="text-xs text-amber-300 font-bold mb-1">
                  القافية:
                </div>
                <div className="text-sm text-foreground">{rhyme}</div>
              </div>
            )}
          </div>

          {analysis && (
            <div className="pt-4 border-t border-amber-500/20">
              <div className="text-xs text-amber-300 font-bold mb-2">
                التحليل:
              </div>
              <div className="text-foreground/90 leading-relaxed text-sm">
                {analysis}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 8. ProcessCard - كرت الخطوات العملية (للصناعي والمواد العملية)
// ============================================================
export function ProcessCard({
  children,
  title,
  steps,
  tools,
  safety,
}: {
  children?: React.ReactNode;
  title?: string;
  steps?: string[];
  tools?: string[];
  safety?: string;
}) {
  const content = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(content + (title || ""));
  const [isOpen, setIsOpen] = React.useState(true);

  let parsedTitle = title || "خطوات العمل";
  let parsedSteps: string[] = steps || [];
  let parsedTools: string[] = tools || [];
  let parsedSafety = safety || "";

  if (!title && content) {
    const parts = content.split("|").map((p) => p.trim());
    parts.forEach((part) => {
      if (
        part.toLowerCase().startsWith("خطوات:") ||
        part.toLowerCase().startsWith("steps:")
      ) {
        parsedSteps = part
          .split(":")
          .slice(1)
          .join(":")
          .split(/[؛;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (
        part.toLowerCase().startsWith("أدوات:") ||
        part.toLowerCase().startsWith("tools:")
      ) {
        parsedTools = part
          .split(":")
          .slice(1)
          .join(":")
          .split(/[،,]/)
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (
        part.toLowerCase().startsWith("سلامة:") ||
        part.toLowerCase().startsWith("safety:")
      ) {
        parsedSafety = part.split(":").slice(1).join(":").trim();
      }
    });
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-blue-950/10 via-card to-card border-2 border-blue-500/30 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-[0_0_40px_hsl(210,70%,50%/0.2)] transition-all duration-500 shadow-lg"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="px-6 py-4 border-b border-blue-500/20 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 transition-colors">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-foreground font-bold text-base tracking-wide">
            {parsedTitle}
          </h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          aria-label={isOpen ? "طي المحتوى" : "عرض المحتوى"}
        >
          <ChevronDown
            className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${!isOpen ? "-rotate-90" : ""
              }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-6 space-y-6">
          {parsedTools.length > 0 && (
            <div>
              <div className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                الأدوات المطلوبة:
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedTools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-200"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsedSteps.length > 0 && (
            <div>
              <div className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                خطوات التنفيذ:
              </div>
              <ol className="space-y-3">
                {parsedSteps.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-300">
                      {idx + 1}
                    </span>
                    <div className="flex-1 text-foreground/90 leading-relaxed pt-1">
                      {step}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {parsedSafety && (
            <div className="pt-4 border-t border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4">
              <div className="text-sm font-bold text-yellow-300 mb-2">
                ⚠️ تحذيرات السلامة:
              </div>
              <div className="text-foreground/90 text-sm leading-relaxed">
                {parsedSafety}
              </div>
            </div>
          )}

          {children && (
            <div className="text-foreground/90 leading-relaxed">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Legacy Components (kept for backward compatibility)
// ============================================================

// بطاقة التعريف (المعلومة الهامة)
export function Card({
  children,
  badge,
  isExample,
  title,
}: {
  children: React.ReactNode;
  badge?: string;
  isExample?: boolean;
  title?: string;
}) {
  const text = String(children || "");
  const isArabic = /[\u0600-\u06FF]/.test(text);

  const colonIndex = title ? -1 : text.indexOf(":");
  const parsedTitle =
    title || (colonIndex > 0 ? text.slice(0, colonIndex).trim() : null);
  const body = colonIndex > 0 ? text.slice(colonIndex + 1).trim() : text;

  const example = Boolean(isExample || /(^|\s)مثال/i.test(text));
  const badgeText =
    badge || (example ? "مثال" : parsedTitle ? parsedTitle : "معلومة");

  const baseClasses =
    "h-full my-0 rounded-xl p-5 backdrop-blur-sm relative border-l-4 pl-4";
  const variantClasses = example
    ? "bg-yellow-950/10 border border-yellow-700/20"
    : "bg-muted/30 border border-border border-l-primary shadow-md";

  return (
    <div
      className={`${baseClasses} ${variantClasses}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div
        className={`absolute ${isArabic ? "left-4" : "right-4"
          } top-4 bg-background/50 px-3 py-1 rounded-full border border-border text-xs ${example ? "text-yellow-300" : "text-primary"
          }`}
      >
        {badgeText}
      </div>

      <div
        className={`flex items-center gap-2 mb-3 ${isArabic ? "flex-row-reverse" : "flex-row"
          }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${example
            ? "bg-yellow-400 shadow-[0_0_8px_#FFD166]"
            : "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.9)]"
            }`}
        />
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${example ? "text-yellow-300" : "text-primary"
            }`}
        >
          {badgeText}
        </div>
        <div className="ml-2 -mr-1">
          <BookOpen
            className={`w-4 h-4 ${example ? "text-yellow-300" : "text-primary"
              }`}
          />
        </div>
      </div>

      {parsedTitle ? (
        <div className="mb-2">
          <div
            className={`text-lg font-semibold ${example ? "text-yellow-200" : "text-primary"
              }`}
          >
            {parsedTitle}
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {body}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {body}
        </div>
      )}
    </div>
  );
}

// Action Card (small grid card for bullets / action items)
export function ActionCard({
  children,
  isExample,
  rtl,
  title,
  points,
  type,
}: {
  children?: React.ReactNode;
  isExample?: boolean;
  rtl?: boolean;
  title?: string;
  points?: string[];
  type?: "core" | "explanation" | "note";
}) {
  const base = `h-full p-6 rounded-2xl border border-primary/30 bg-card/50 transition-all`;
  const Icon = type === "core" ? Sparkles : type === "note" ? Hash : Lightbulb;

  const formatPoint = (raw: string) => {
    const cleaned = raw.replace(/\*\*/g, "").trim();
    const colonIdx = cleaned.indexOf(":");
    if (colonIdx > 0) {
      const t = cleaned.slice(0, colonIdx).trim();
      const d = cleaned.slice(colonIdx + 1).trim();
      return {
        title: t,
        desc: d
          .split(/[؛;،,\.]/)
          .slice(0, 2)
          .join(" ")
          .trim(),
      };
    }

    const clauses = cleaned
      .split(/[؛،,\.]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (clauses.length >= 2) {
      return { title: clauses[0], desc: clauses[1] };
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    const titleText = words.slice(0, 4).join(" ");
    const desc = words.slice(4, 12).join(" ");
    return { title: titleText || cleaned, desc: desc || "" };
  };

  const formattedPoints = points?.map(formatPoint) || [];

  return (
    <div className={base} dir={rtl ? "rtl" : "ltr"}>
      <div className={`flex flex-col gap-4`}>
        {title && (
          <div className={`flex items-center gap-3`}>
            <div className="text-primary p-1 rounded-md bg-transparent">
              <Icon className="w-5 h-5" />
            </div>
            <div
              className={`text-lg font-bold text-foreground ${type === "core" ? "text-2xl" : ""
                }`}
            >
              {title}
            </div>
          </div>
        )}

        {formattedPoints.length > 0 && (
          <ol className="list-none m-0 p-0 space-y-4">
            {formattedPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-base font-bold bg-primary/10 text-primary`}
                >
                  {i + 1}
                </div>
                <div className="flex flex-col">
                  <div className="text-lg font-bold text-foreground">
                    {p.title}
                  </div>
                  {p.desc && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.desc}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {children && (
          <div className="text-sm text-muted-foreground mt-2">{children}</div>
        )}
      </div>
    </div>
  );
}

// حاوية البطاقات لعرض عدة بطاقات في تخطيط شبكة
export function CardsContainer({
  cards,
}: {
  cards: {
    title: string;
    description?: string;
    points?: string[];
    type?: "core" | "explanation" | "note" | "group";
  }[];
}) {
  const groupedCards: {
    [key: string]: {
      title: string;
      items: {
        title: string;
        description?: string;
        points?: string[];
        type?: "core" | "explanation" | "note";
      }[];
    };
  } = {};

  cards.forEach((card) => {
    const isGroupTitle = card.type === "group";

    if (isGroupTitle) {
      groupedCards[card.title] = { title: card.title, items: [] };
    } else {
      const lastGroup = Object.keys(groupedCards).pop();
      if (lastGroup) {
        const { type, ...cardWithoutGroup } = card;
        groupedCards[lastGroup].items.push(
          cardWithoutGroup as {
            title: string;
            description?: string;
            points?: string[];
            type?: "core" | "explanation" | "note";
          }
        );
      }
    }
  });

  return (
    <div className="space-y-12" dir="rtl">
      {Object.values(groupedCards).map((group, idx) => (
        <div key={idx}>
          <div className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-8 shadow-lg mb-6">
            <h3 className="text-4xl font-bold tracking-wide">{group.title}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {group.items.map((item, itemIdx) => (
              <Card key={itemIdx} title={item.title}>
                <div className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.description}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}