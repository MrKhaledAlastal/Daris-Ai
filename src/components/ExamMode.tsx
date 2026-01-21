// components/ExamMode.tsx - وضع الامتحان الكامل ⚡

"use client";

import React, { useState, useEffect } from "react";
import { Clock, Zap, Target, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

// ============================================================
// Types
// ============================================================
export interface ExamModeState {
  enabled: boolean;
  subject: string;
  timeLeft?: number;  // بالساعات
  focusTopics?: string[];
  startTime?: Date;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

// ============================================================
// ExamMode Banner - شريط علوي يظهر لما يفعّل الوضع
// ============================================================
export function ExamModeBanner({ 
  examMode, 
  onDisable 
}: { 
  examMode: ExamModeState; 
  onDisable: () => void;
}) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (examMode.enabled && examMode.startTime && examMode.timeLeft) {
      const timer = setInterval(() => {
        const now = new Date();
        const examTime = new Date(examMode.startTime!);
        examTime.setHours(examTime.getHours() + examMode.timeLeft!);
        
        const diff = examTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setCountdown(`${hours}س ${minutes}د`);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [examMode]);

  if (!examMode.enabled) return null;

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white px-6 py-3 shadow-lg animate-pulse">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-lg">وضع الامتحان مفعّل</span>
          </div>
          
          {examMode.timeLeft && (
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{countdown}</span>
            </div>
          )}
          
          <div className="text-sm bg-white/20 rounded-full px-3 py-1">
            {examMode.subject}
          </div>
        </div>

        <button
          onClick={onDisable}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 transition-colors text-sm font-semibold"
        >
          <XCircle className="w-4 h-4" />
          إيقاف
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ExamMode Activator - زر تفعيل الوضع
// ============================================================
export function ExamModeActivator({
  onActivate,
  subjects
}: {
  onActivate: (config: ExamModeState) => void;
  subjects: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(12); // default 12 hours

  const handleActivate = () => {
    if (!selectedSubject) return;

    onActivate({
      enabled: true,
      subject: selectedSubject,
      timeLeft: timeLeft,
      startTime: new Date()
    });

    setIsOpen(false);
  };

  return (
    <>
      {/* زر التفعيل */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <Zap className="w-5 h-5 relative z-10" />
        <span className="relative z-10">⚡ وضع الامتحان - شرح سريع</span>
      </button>

      {/* Modal الإعدادات */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-500" />
                تفعيل وضع الامتحان
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* اختيار المادة */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  المادة
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* وقت الامتحان */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  كم ساعة باقية للامتحان؟
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={timeLeft}
                  onChange={(e) => setTimeLeft(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  placeholder="مثال: 12"
                />
                <p className="text-xs text-gray-500 mt-1">
                  سنعرض عداد تنازلي ونركز على الشرح السريع
                </p>
              </div>

              {/* معلومات */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-200">
                    <p className="font-semibold mb-1">ماذا سيحدث؟</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ شرح سريع في 30 ثانية</li>
                      <li>✓ تركيز على الأساسيات</li>
                      <li>✓ أمثلة محلولة مباشرة</li>
                      <li>✓ تحذيرات من الأخطاء الشائعة</li>
                      <li>✓ نصائح للامتحان</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* أزرار */}
              <div className="flex gap-3">
                <button
                  onClick={handleActivate}
                  disabled={!selectedSubject}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  تفعيل الآن
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Quick Actions - أزرار سريعة للطالب
// ============================================================
export function QuickActions({
  onAction,
  subject
}: {
  onAction: (prompt: string) => void;
  subject: string;
}) {
  const actions: QuickAction[] = [
    {
      id: "quick-explain",
      label: "شرح سريع",
      icon: <Zap className="w-4 h-4" />,
      prompt: `اشرحلي بسرعة أهم نقطة في ${subject} - 30 ثانية فقط`
    },
    {
      id: "example",
      label: "مثال محلول",
      icon: <Target className="w-4 h-4" />,
      prompt: `أعطني مثال محلول بسيط على ${subject} - خطوة خطوة`
    },
    {
      id: "mistakes",
      label: "الأخطاء الشائعة",
      icon: <AlertTriangle className="w-4 h-4" />,
      prompt: `شو أشهر 3 أخطاء بيقع فيها الطلاب في ${subject}؟`
    },
    {
      id: "tips",
      label: "نصائح سريعة",
      icon: <CheckCircle className="w-4 h-4" />,
      prompt: `أعطني 3 نصائح سريعة للامتحان في ${subject}`
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.prompt)}
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Understanding Check - تأكيد الفهم
// ============================================================
export function UnderstandingCheck({
  onUnderstood,
  onNeedMore,
  topic
}: {
  onUnderstood: () => void;
  onNeedMore: () => void;
  topic: string;
}) {
  return (
    <div className="my-6 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-blue-500/30 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 text-center">
        فهمت {topic}؟
      </h3>
      
      <div className="flex gap-4">
        <button
          onClick={onUnderstood}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <CheckCircle className="w-5 h-5" />
          ✅ فهمت - التالي
        </button>
        
        <button
          onClick={onNeedMore}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <XCircle className="w-5 h-5" />
          ❌ ما فهمت - مثال تاني
        </button>
      </div>
      
      <p className="text-center text-gray-400 text-sm mt-3">
        كن صريحاً - ما في مشكلة! بنساعدك لحد ما تفهم 💪
      </p>
    </div>
  );
}

// ============================================================
// Progress Tracker - تتبع التقدم
// ============================================================
export function ProgressTracker({
  totalTopics,
  completedTopics,
  currentTopic
}: {
  totalTopics: number;
  completedTopics: number;
  currentTopic: string;
}) {
  const progress = (completedTopics / totalTopics) * 100;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-300">
          التقدم: {completedTopics} / {totalTopics} مواضيع
        </span>
        <span className="text-sm font-bold text-emerald-400">
          {progress.toFixed(0)}%
        </span>
      </div>
      
      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {currentTopic && (
        <p className="text-xs text-gray-500 mt-2">
          الموضوع الحالي: <span className="text-emerald-400">{currentTopic}</span>
        </p>
      )}
    </div>
  );
}

// ============================================================
// Exam Mode Hook - للاستخدام في الصفحة الرئيسية
// ============================================================
export function useExamMode() {
  const [examMode, setExamMode] = useState<ExamModeState>({
    enabled: false,
    subject: ""
  });

  const activateExamMode = (config: ExamModeState) => {
    setExamMode(config);
    // حفظ في localStorage
    localStorage.setItem('examMode', JSON.stringify(config));
  };

  const deactivateExamMode = () => {
    setExamMode({ enabled: false, subject: "" });
    localStorage.removeItem('examMode');
  };

  // استرجاع من localStorage عند التحميل
  useEffect(() => {
    const saved = localStorage.getItem('examMode');
    if (saved) {
      const config = JSON.parse(saved);
      // تحقق إذا الوقت لسا صالح
      if (config.startTime && config.timeLeft) {
        const now = new Date();
        const examTime = new Date(config.startTime);
        examTime.setHours(examTime.getHours() + config.timeLeft);
        
        if (now < examTime) {
          setExamMode(config);
        } else {
          // الوقت انتهى
          localStorage.removeItem('examMode');
        }
      }
    }
  }, []);

  return {
    examMode,
    activateExamMode,
    deactivateExamMode
  };
}