// components/NewMessageBlocks.tsx - البطاقات الجديدة المحسّنة
"use client";

import React from "react";
import { Calculator, AlertTriangle, Lightbulb, Eye } from "lucide-react";

// ============================================================
// 1. StepCard - بطاقة الخطوة (للرياضيات)
// ============================================================
export function StepCard({
  stepNumber,
  explanation,
  calculation,
}: {
  stepNumber: number;
  explanation: string;
  calculation: string;
}) {
  return (
    <div className="flex gap-4 items-start my-4">
      {/* رقم الخطوة */}
      <div className="flex-shrink-0 relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50 border-2 border-blue-400">
          <span className="text-xl font-bold text-white">{stepNumber}</span>
        </div>
        {/* الخط الواصل */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-blue-500/50 to-transparent"></div>
      </div>

      {/* المحتوى */}
      <div className="flex-1 pt-1">
        {/* الشرح */}
        <p className="text-gray-200 mb-3 text-base" dir="rtl">
          {explanation}
        </p>

        {/* الحساب */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 border-l-4 border-emerald-500 shadow-lg">
          <div className="font-mono text-2xl text-emerald-300 tracking-wide" dir="ltr">
            {calculation}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. VisualCard - بطاقة الرسم التوضيحي
// ============================================================
export function VisualCard({
  type,
  elements,
  description,
}: {
  type: "circle" | "triangle" | "rectangle" | "graph";
  elements?: string[];
  description?: string;
}) {
  const renderShape = () => {
    switch (type) {
      case "circle":
        return (
          <svg width="250" height="250" viewBox="0 0 250 250" className="mx-auto">
            {/* الدائرة */}
            <circle
              cx="125"
              cy="125"
              r="90"
              fill="none"
              stroke="url(#circleGrad)"
              strokeWidth="3"
              className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
            {/* نصف القطر */}
            <line
              x1="125"
              y1="125"
              x2="215"
              y2="125"
              stroke="#f59e0b"
              strokeWidth="2.5"
              markerEnd="url(#arrowhead)"
            />
            {/* المركز */}
            <circle cx="125" cy="125" r="4" fill="#10b981" />
            {/* النص */}
            <text
              x="170"
              y="115"
              fill="#f59e0b"
              fontSize="18"
              fontWeight="bold"
              className="font-mono"
            >
              r
            </text>
            <text
              x="115"
              y="145"
              fill="#10b981"
              fontSize="14"
              className="text-xs"
            >
              المركز
            </text>

            {/* Gradients */}
            <defs>
              <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
              </marker>
            </defs>
          </svg>
        );

      case "triangle":
        return (
          <svg width="250" height="250" viewBox="0 0 250 250" className="mx-auto">
            {/* المثلث */}
            <polygon
              points="125,40 40,210 210,210"
              fill="none"
              stroke="url(#triGrad)"
              strokeWidth="3"
              className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
            {/* القاعدة */}
            <line
              x1="40"
              y1="210"
              x2="210"
              y2="210"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <text
              x="120"
              y="230"
              fill="#f59e0b"
              fontSize="16"
              className="font-mono"
            >
              القاعدة
            </text>
            {/* الارتفاع */}
            <line
              x1="125"
              y1="40"
              x2="125"
              y2="210"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="5,5"
            />
            <text
              x="135"
              y="130"
              fill="#10b981"
              fontSize="16"
              className="font-mono"
            >
              h
            </text>

            <defs>
              <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        );

      case "rectangle":
        return (
          <svg width="300" height="200" viewBox="0 0 300 200" className="mx-auto">
            {/* المستطيل */}
            <rect
              x="50"
              y="50"
              width="200"
              height="100"
              fill="none"
              stroke="url(#rectGrad)"
              strokeWidth="3"
              className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            />
            {/* الطول */}
            <line
              x1="50"
              y1="170"
              x2="250"
              y2="170"
              stroke="#f59e0b"
              strokeWidth="2.5"
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <text
              x="140"
              y="190"
              fill="#f59e0b"
              fontSize="16"
              className="font-mono"
            >
              الطول (L)
            </text>
            {/* العرض */}
            <line
              x1="30"
              y1="50"
              x2="30"
              y2="150"
              stroke="#10b981"
              strokeWidth="2.5"
              markerStart="url(#arrowStart2)"
              markerEnd="url(#arrowEnd2)"
            />
            <text
              x="5"
              y="105"
              fill="#10b981"
              fontSize="16"
              className="font-mono"
              transform="rotate(-90, 15, 100)"
            >
              العرض (W)
            </text>

            <defs>
              <linearGradient id="rectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <marker
                id="arrowStart"
                markerWidth="10"
                markerHeight="10"
                refX="1"
                refY="3"
                orient="auto"
              >
                <polygon points="10 0, 0 3, 10 6" fill="#f59e0b" />
              </marker>
              <marker
                id="arrowEnd"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
              </marker>
              <marker
                id="arrowStart2"
                markerWidth="10"
                markerHeight="10"
                refX="1"
                refY="3"
                orient="auto"
              >
                <polygon points="10 0, 0 3, 10 6" fill="#10b981" />
              </marker>
              <marker
                id="arrowEnd2"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
              </marker>
            </defs>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-6 bg-gradient-to-br from-purple-950/20 to-gray-900 rounded-2xl p-6 border-2 border-purple-500/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Eye className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-purple-300">🎨 رسم توضيحي</h3>
      </div>

      {/* الرسم */}
      <div className="bg-black/30 rounded-xl p-8 mb-4">
        {renderShape()}
      </div>

      {/* العناصر */}
      {elements && elements.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" dir="rtl">
          {elements.map((elem, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-200"
            >
              {elem}
            </span>
          ))}
        </div>
      )}

      {/* الوصف */}
      {description && (
        <p className="text-gray-300 text-center text-sm" dir="rtl">
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================================
// 3. WarningCard - بطاقة التحذير
// ============================================================
export function WarningCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-yellow-500/10">
      <div className="flex-shrink-0 p-2 rounded-lg bg-yellow-500/20">
        <AlertTriangle className="w-6 h-6 text-yellow-400" />
      </div>
      <div className="flex-1 pt-1">
        <h4 className="text-yellow-300 font-bold mb-1 text-sm">⚠️ تحذير - خطأ شائع</h4>
        <p className="text-yellow-100/90 text-sm leading-relaxed" dir="rtl">
          {children}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 4. TipCard - بطاقة النصيحة
// ============================================================
export function TipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500/50 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-blue-500/10">
      <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20">
        <Lightbulb className="w-6 h-6 text-blue-400" />
      </div>
      <div className="flex-1 pt-1">
        <h4 className="text-blue-300 font-bold mb-1 text-sm">💡 نصيحة مفيدة</h4>
        <p className="text-blue-100/90 text-sm leading-relaxed" dir="rtl">
          {children}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 5. ImprovedBox - Box محسّن للرياضيات
// ============================================================
export function ImprovedBox({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const content = String(children || "");
  
  // Parse formula: "A = πr² | A: المساحة (سم²) | r: نصف القطر (سم)"
  const parts = content.split("|").map(p => p.trim());
  const formula = parts[0] || "";
  const variables = parts.slice(1).map(v => {
    const [symbol, ...rest] = v.split(":");
    return {
      symbol: symbol.trim(),
      label: rest.join(":").trim(),
    };
  });

  return (
    <div className="relative my-8 group">
      {/* العنوان فوق */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <span>{title || "القانون الرياضي"}</span>
        </div>
      </div>

      {/* البطاقة */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-emerald-500/30 rounded-2xl p-8 shadow-2xl hover:border-emerald-500/50 transition-all duration-300 hover:shadow-emerald-500/20">
        
        {/* المعادلة الرئيسية */}
        <div className="text-center mb-8">
          <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 mb-3 font-mono tracking-wide" dir="ltr">
            {formula}
          </div>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full"></div>
        </div>

        {/* المتغيرات */}
        {variables.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {variables.map((v, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:bg-white/10"
              >
                <div className="text-4xl font-bold text-emerald-400 mb-2 font-mono">
                  {v.symbol}
                </div>
                <div className="text-sm text-gray-300" dir="rtl">
                  {v.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}