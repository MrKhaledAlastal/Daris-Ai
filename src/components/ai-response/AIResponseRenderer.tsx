/**
 * AI Response Renderer Component
 * Dynamically renders AI responses based on branch and section types
 */

"use client";

import React from "react";
import { AIResponse, AIResponseSection } from "@/types/ai-response";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Target,
  TrendingUp,
  HelpCircle,
} from "lucide-react";

interface AIResponseRendererProps {
  response: AIResponse;
  className?: string;
}

export function AIResponseRenderer({
  response,
  className,
}: AIResponseRendererProps) {
  const isArabic = response.metadata.language === "ar";

  return (
    <div className={cn("space-y-4", className)} dir={isArabic ? "rtl" : "ltr"}>
      {response.sections.map((section, index) => (
        <SectionRenderer
          key={`${section.type}-${index}`}
          section={section}
          isArabic={isArabic}
        />
      ))}

      {/* Sources */}
      {response.metadata.sources && response.metadata.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground/70 mb-2">
            {isArabic ? "المصادر:" : "Sources:"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {response.metadata.sources.map((source, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20"
              >
                {source.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Section Renderer Component
// ============================================================

function SectionRenderer({
  section,
  isArabic,
}: {
  section: AIResponseSection;
  isArabic: boolean;
}) {
  switch (section.type) {
    case "lesson_title":
      return <LessonTitleSection section={section} isArabic={isArabic} />;
    case "simplified_explanation":
      return (
        <SimplifiedExplanationSection section={section} isArabic={isArabic} />
      );
    case "example":
      return <ExampleSection section={section} isArabic={isArabic} />;
    case "thinking_question":
      return <ThinkingQuestionSection section={section} isArabic={isArabic} />;
    case "definition":
      return <DefinitionSection section={section} isArabic={isArabic} />;
    case "formula":
      return <FormulaSection section={section} isArabic={isArabic} />;
    case "solved_example":
      return <SolvedExampleSection section={section} isArabic={isArabic} />;
    case "important_note":
      return <ImportantNoteSection section={section} isArabic={isArabic} />;
    case "main_idea":
      return <MainIdeaSection section={section} isArabic={isArabic} />;
    case "detailed_explanation":
      return (
        <DetailedExplanationSection section={section} isArabic={isArabic} />
      );
    case "key_points":
      return <KeyPointsSection section={section} isArabic={isArabic} />;
    case "analytical_question":
      return (
        <AnalyticalQuestionSection section={section} isArabic={isArabic} />
      );
    case "lesson_objective":
      return <LessonObjectiveSection section={section} isArabic={isArabic} />;
    case "tools_components":
      return <ToolsComponentsSection section={section} isArabic={isArabic} />;
    case "procedure":
      return <ProcedureSection section={section} isArabic={isArabic} />;
    case "safety_warnings":
      return <SafetyWarningsSection section={section} isArabic={isArabic} />;
    case "common_mistakes":
      return <CommonMistakesSection section={section} isArabic={isArabic} />;
    case "concept_explanation":
      return (
        <ConceptExplanationSection section={section} isArabic={isArabic} />
      );
    case "business_example":
      return <BusinessExampleSection section={section} isArabic={isArabic} />;
    case "practical_scenario":
      return <PracticalScenarioSection section={section} isArabic={isArabic} />;
    case "decision_question":
      return <DecisionQuestionSection section={section} isArabic={isArabic} />;
    default:
      return null;
  }
}

// ============================================================
// Common Section Components
// ============================================================

function LessonTitleSection({ section, isArabic }: any) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
        {section.title}
      </h1>
      {section.subtitle && (
        <p className="text-foreground/70 text-base">{section.subtitle}</p>
      )}
    </div>
  );
}

function SimplifiedExplanationSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary mb-2">
            {isArabic ? "شرح مبسط" : "Simplified Explanation"}
          </h3>
          <p className="text-foreground/85 text-sm leading-relaxed">
            {section.content}
          </p>
          {section.keyPoints && section.keyPoints.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {section.keyPoints.map((point: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {section.title || (isArabic ? "مثال" : "Example")}
          </h3>
          <p className="text-foreground/85 text-sm leading-relaxed">
            {section.content}
          </p>
        </div>
      </div>
    </div>
  );
}

function ThinkingQuestionSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl">
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary mb-2">
            {isArabic ? "💭 سؤال للتفكير" : "💭 Thinking Question"}
          </h3>
          <p className="text-foreground font-medium text-sm mb-2">
            {section.question}
          </p>
          {section.hint && (
            <p className="text-foreground/60 text-xs italic">
              {isArabic ? "تلميح: " : "Hint: "}
              {section.hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Scientific Branch Components
// ============================================================

function DefinitionSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border-l-4 border-primary rounded-r-xl">
      <h3 className="text-sm font-semibold text-primary mb-1">
        {isArabic ? "تعريف" : "Definition"}: {section.term}
      </h3>
      <p className="text-foreground/85 text-sm leading-relaxed">
        {section.definition}
      </p>
    </div>
  );
}

function FormulaSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="text-center mb-4">
        <div className="text-2xl font-mono font-bold text-foreground">
          {section.formula}
        </div>
      </div>
      <div className="space-y-2">
        {section.variables.map((v: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 min-w-[40px] text-center">
              {v.symbol}
            </span>
            <span className="text-foreground/70">:</span>
            <span className="text-foreground/80 flex-1">
              {v.name}
              {v.unit && (
                <span className="text-foreground/60 text-xs ml-1">
                  ({v.unit})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SolvedExampleSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-primary/20 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-3">
        ✨ {isArabic ? "مثال محلول" : "Solved Example"}
      </h3>

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-primary/90 mb-1">
            {isArabic ? "السؤال:" : "Question:"}
          </h4>
          <p className="text-foreground/85 text-sm">{section.question}</p>
        </div>

        {section.givens && section.givens.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-primary/90 mb-1">
              {isArabic ? "المعطيات:" : "Given:"}
            </h4>
            <div className="flex gap-2 flex-wrap">
              {section.givens.map((given: string, idx: number) => (
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

        <div>
          <h4 className="text-xs font-semibold text-primary/90 mb-2">
            {isArabic ? "الحل:" : "Solution:"}
          </h4>
          <div className="space-y-2">
            {section.steps.map((step: string, idx: number) => (
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

        <div className="pt-3 border-t border-primary/10">
          <div className="text-xs text-foreground/60 mb-1">
            {isArabic ? "النتيجة النهائية:" : "Final Result:"}
          </div>
          <div className="text-lg font-bold text-primary">{section.result}</div>
        </div>
      </div>
    </div>
  );
}

function ImportantNoteSection({ section, isArabic }: any) {
  const levelColors = {
    info: "border-blue-500/30 bg-blue-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    critical: "border-red-500/30 bg-red-500/5",
  };

  return (
    <div
      className={cn(
        "p-4 border-l-4 rounded-r-xl",
        levelColors[(section.level || "info") as keyof typeof levelColors]
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {isArabic ? "ملاحظة مهمة" : "Important Note"}
          </h3>
          <p className="text-foreground/85 text-sm leading-relaxed">
            {section.content}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Literary Branch Components
// ============================================================

function MainIdeaSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-2">
        💡 {isArabic ? "الفكرة الرئيسية" : "Main Idea"}
      </h3>
      <p className="text-foreground text-base font-medium leading-relaxed">
        {section.idea}
      </p>
      {section.context && (
        <p className="text-foreground/70 text-sm mt-2">{section.context}</p>
      )}
    </div>
  );
}

function DetailedExplanationSection({ section, isArabic }: any) {
  return (
    <div className="space-y-3">
      <p className="text-foreground/85 text-sm leading-relaxed">
        {section.content}
      </p>
      {section.subsections && section.subsections.length > 0 && (
        <div className="space-y-2">
          {section.subsections.map((sub: any, idx: number) => (
            <div
              key={idx}
              className="p-3 bg-card border border-border rounded-lg"
            >
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {sub.heading}
              </h4>
              <p className="text-foreground/80 text-sm">{sub.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyPointsSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-3">
        📌 {isArabic ? "نقاط أساسية" : "Key Points"}
      </h3>
      <ul className="space-y-2">
        {section.points.map((point: string, idx: number) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-foreground/80"
          >
            <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
            <span className="flex-1">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalyticalQuestionSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-2">
        🤔 {isArabic ? "سؤال تحليلي" : "Analytical Question"}
      </h3>
      <p className="text-foreground font-medium text-sm mb-2">
        {section.question}
      </p>
      {section.guidePoints && section.guidePoints.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-foreground/60 font-semibold">
            {isArabic ? "نقاط إرشادية:" : "Guide Points:"}
          </p>
          {section.guidePoints.map((point: string, idx: number) => (
            <p key={idx} className="text-xs text-foreground/70">
              • {point}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Industrial Branch Components
// ============================================================

function LessonObjectiveSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary mb-2">
            {isArabic ? "هدف الدرس" : "Lesson Objective"}
          </h3>
          <p className="text-foreground/85 text-sm leading-relaxed">
            {section.objective}
          </p>
          {section.learningOutcomes && section.learningOutcomes.length > 0 && (
            <ul className="mt-3 space-y-1">
              {section.learningOutcomes.map((outcome: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolsComponentsSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-start gap-3">
        <Wrench className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary mb-3">
            🔧 {isArabic ? "الأدوات والمكونات" : "Tools & Components"}
          </h3>

          <div className="space-y-3">
            {section.tools && section.tools.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground/70 mb-2">
                  {isArabic ? "الأدوات:" : "Tools:"}
                </h4>
                <div className="space-y-1">
                  {section.tools.map((tool: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <div className="flex-1">
                        <span className="text-foreground font-medium">
                          {tool.name}
                        </span>
                        {tool.quantity && (
                          <span className="text-foreground/60 text-xs ml-2">
                            ({tool.quantity})
                          </span>
                        )}
                        {tool.description && (
                          <p className="text-foreground/70 text-xs mt-0.5">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.components && section.components.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground/70 mb-2">
                  {isArabic ? "المكونات:" : "Components:"}
                </h4>
                <div className="space-y-1">
                  {section.components.map((comp: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <div className="flex-1">
                        <span className="text-foreground font-medium">
                          {comp.name}
                        </span>
                        {comp.specification && (
                          <span className="text-foreground/60 text-xs ml-2">
                            [{comp.specification}]
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcedureSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-primary/20 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-3">
        📋 {isArabic ? "الخطوات" : "Procedure"}
      </h3>
      <div className="space-y-3">
        {section.steps.map((step: any) => (
          <div key={step.number} className="flex items-start gap-3">
            <div className="size-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-primary font-bold shrink-0">
              {step.number}
            </div>
            <div className="flex-1">
              <p className="text-foreground/85 text-sm leading-relaxed">
                {step.description}
              </p>
              {step.warning && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700">
                  ⚠️ {step.warning}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SafetyWarningsSection({ section, isArabic }: any) {
  const levelColors = {
    low: "border-blue-500/30 bg-blue-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    high: "border-orange-500/30 bg-orange-500/5",
    critical: "border-red-500/30 bg-red-500/5",
  };

  return (
    <div
      className={cn(
        "p-4 border-l-4 rounded-r-xl",
        levelColors[section.level as keyof typeof levelColors]
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-600 mb-2">
            ⚠️ {isArabic ? "تحذيرات السلامة" : "Safety Warnings"}
          </h3>
          <ul className="space-y-1.5">
            {section.warnings.map((warning: string, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground/85"
              >
                <span className="text-red-600 font-bold">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CommonMistakesSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-3">
        ❌ {isArabic ? "أخطاء شائعة" : "Common Mistakes"}
      </h3>
      <div className="space-y-3">
        {section.mistakes.map((item: any, idx: number) => (
          <div
            key={idx}
            className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-red-600 font-bold text-xs">✗</span>
              <p className="text-sm text-red-600 font-medium flex-1">
                {item.mistake}
              </p>
            </div>
            <div className="flex items-start gap-2 ml-4">
              <span className="text-green-600 font-bold text-xs">✓</span>
              <p className="text-sm text-green-600 flex-1">{item.correction}</p>
            </div>
            {item.reason && (
              <p className="text-xs text-foreground/60 mt-2 ml-4">
                {isArabic ? "السبب: " : "Reason: "}
                {item.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Entrepreneurship Branch Components
// ============================================================

function ConceptExplanationSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-2">
        💼 {section.concept}
      </h3>
      <p className="text-foreground/85 text-sm leading-relaxed">
        {section.explanation}
      </p>
      {section.relatedConcepts && section.relatedConcepts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-foreground/60 mb-1">
            {isArabic ? "مفاهيم ذات صلة:" : "Related Concepts:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {section.relatedConcepts.map((concept: string, idx: number) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessExampleSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-card border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary mb-2">
            📊 {section.title}
          </h3>
          <p className="text-foreground/85 text-sm leading-relaxed mb-3">
            {section.scenario}
          </p>
          {section.outcome && (
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-700 mb-2">
              <span className="font-semibold">
                {isArabic ? "النتيجة: " : "Outcome: "}
              </span>
              {section.outcome}
            </div>
          )}
          {section.lessons && section.lessons.length > 0 && (
            <div>
              <p className="text-xs text-foreground/60 font-semibold mb-1">
                {isArabic ? "الدروس المستفادة:" : "Lessons Learned:"}
              </p>
              <ul className="space-y-1">
                {section.lessons.map((lesson: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-foreground/75"
                  >
                    <span className="text-primary">•</span>
                    <span>{lesson}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PracticalScenarioSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-2">
        🎯 {isArabic ? "سيناريو عملي" : "Practical Scenario"}
      </h3>
      <p className="text-foreground/85 text-sm leading-relaxed mb-2">
        {section.scenario}
      </p>
      <p className="text-foreground/70 text-xs mb-3">{section.context}</p>
      {section.questions && section.questions.length > 0 && (
        <div className="pt-3 border-t border-primary/10">
          <p className="text-xs text-foreground/60 font-semibold mb-2">
            {isArabic ? "أسئلة للتفكير:" : "Questions to Consider:"}
          </p>
          <ul className="space-y-1">
            {section.questions.map((q: string, idx: number) => (
              <li key={idx} className="text-xs text-foreground/75">
                {idx + 1}. {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DecisionQuestionSection({ section, isArabic }: any) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl">
      <h3 className="text-sm font-semibold text-primary mb-2">
        🤔 {isArabic ? "سؤال قرار" : "Decision Question"}
      </h3>
      <p className="text-foreground font-medium text-sm mb-3">
        {section.situation}
      </p>
      <div className="space-y-2 mb-3">
        {section.options.map((option: string, idx: number) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 bg-card rounded border border-border"
          >
            <span className="text-primary font-semibold text-xs shrink-0 mt-0.5">
              {String.fromCharCode(65 + idx)}.
            </span>
            <span className="text-sm text-foreground/85">{option}</span>
          </div>
        ))}
      </div>
      {section.considerationPoints &&
        section.considerationPoints.length > 0 && (
          <div className="pt-3 border-t border-primary/10">
            <p className="text-xs text-foreground/60 font-semibold mb-2">
              {isArabic ? "نقاط للنظر فيها:" : "Points to Consider:"}
            </p>
            <ul className="space-y-1">
              {section.considerationPoints.map((point: string, idx: number) => (
                <li key={idx} className="text-xs text-foreground/75">
                  • {point}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

// ============================================================
// Dynamic Template Renderer
// ============================================================

type BranchId = "science" | "literature" | "industrial" | "entrepreneurship";

const BRANCH_TEMPLATES: Record<
  BranchId,
  { template: string; variables: Record<string, string> }
> = {
  science: {
    template: "علمي - {{title}}",
    variables: {
      title: "عنوان الدرس",
      objective: "هدف الدرس",
      materials: "المواد المطلوبة",
    },
  },
  literature: {
    template: "أدبي - {{title}}",
    variables: {
      title: "عنوان النص",
      author: "اسم الكاتب",
      genre: "النوع الأدبي",
    },
  },
  industrial: {
    template: "صناعي - {{title}}",
    variables: {
      title: "عنوان المشروع",
      tools: "الأدوات المطلوبة",
      steps: "خطوات التنفيذ",
    },
  },
  entrepreneurship: {
    template: "ريادي - {{title}}",
    variables: {
      title: "عنوان الفكرة",
      problem: "المشكلة المستهدفة",
      solution: "الحل المقترح",
    },
  },
};

function DynamicTemplateRenderer({ branchId }: { branchId: BranchId }) {
  const template = BRANCH_TEMPLATES[branchId];

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-bold mb-2">{template.template}</h3>
      <ul className="list-disc pl-5">
        {Object.entries(template.variables).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {value}
          </li>
        ))}
      </ul>
    </div>
  );
}
