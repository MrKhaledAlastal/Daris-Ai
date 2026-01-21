// services/smartModelSelector.ts - اختيار ذكي للنماذج 🧠

/**
 * نظام ذكي لاختيار أفضل نموذج AI حسب:
 * - المادة (رياضيات، فيزياء، كيمياء...)
 * - الوضع (عادي أو امتحان)
 * - نوع السؤال (شرح، حل، مثال)
 */

export type Subject = 
  | "math" | "رياضيات"
  | "physics" | "فيزياء"
  | "chemistry" | "كيمياء"
  | "biology" | "أحياء" | "احياء"
  | "arabic" | "عربي"
  | "english" | "انجليزي" | "إنجليزي"
  | "other";

export type Mode = "normal" | "exam" | "quick";

export type QuestionType = "explain" | "solve" | "example" | "practice";

export interface ModelConfig {
  name: string;
  priority: number;  // 1 = highest priority
  strengths: string[];  // ما بيتقن فيه
  weaknesses?: string[];  // ما بيتقن فيه
  speed: "fast" | "medium" | "slow";
  accuracy: "high" | "medium" | "low";
}

// ============================================================
// تقييم النماذج حسب الاختبارات
// ============================================================
const MODELS: Record<string, ModelConfig> = {
  "google/gemini-2.0-flash-exp:free": {
    name: "Gemini Flash 2.0",
    priority: 1,
    strengths: ["سريع جداً", "جيد بالحسابات", "يفهم العربي والإنجليزي", "شرح واضح"],
    speed: "fast",
    accuracy: "high"
  },
  
  "qwen/qwen-2.5-72b-instruct:free": {
    name: "Qwen 2.5 72B",
    priority: 2,
    strengths: ["دقيق جداً بالرياضيات", "ممتاز باللغات", "تفصيل عميق"],
    weaknesses: ["أبطأ شوي"],
    speed: "medium",
    accuracy: "high"
  },
  
  "google/gemma-3-27b-it:free": {
    name: "Gemma 3 27B",
    priority: 3,
    strengths: ["متوازن", "جيد بالنحو", "شرح مفصل"],
    speed: "medium",
    accuracy: "medium"
  },
  
  "xiaomi/mimo-v2-flash:free": {
    name: "Mimo V2 Flash",
    priority: 4,
    strengths: ["سريع", "بديل جيد"],
    speed: "fast",
    accuracy: "medium"
  }
};

// ============================================================
// اختيار النماذج حسب المادة والوضع
// ============================================================
export class SmartModelSelector {
  
  /**
   * اختار أفضل نموذج حسب السياق
   */
  selectModels(
    subject: string,
    mode: Mode = "normal",
    questionType: QuestionType = "explain"
  ): string[] {
    const subjectLower = subject.toLowerCase();
    
    // 🧮 الرياضيات والفيزياء
    if (this.isMathOrPhysics(subjectLower)) {
      return this.getMathPhysicsModels(mode);
    }
    
    // ⚗️ الكيمياء
    if (this.isChemistry(subjectLower)) {
      return this.getChemistryModels(mode);
    }
    
    // 🌱 الأحياء
    if (this.isBiology(subjectLower)) {
      return this.getBiologyModels(mode);
    }
    
    // 📖 اللغة العربية
    if (this.isArabic(subjectLower)) {
      return this.getArabicModels(mode);
    }
    
    // 📝 اللغة الإنجليزية
    if (this.isEnglish(subjectLower)) {
      return this.getEnglishModels(mode);
    }
    
    // Default
    return this.getDefaultModels(mode);
  }
  
  // ============================================================
  // نماذج الرياضيات والفيزياء
  // ============================================================
  private getMathPhysicsModels(mode: Mode): string[] {
    if (mode === "exam" || mode === "quick") {
      // للطالب المزنوق - سرعة + وضوح
      return [
        "google/gemini-2.0-flash-exp:free",    // ← الأسرع والأوضح
        "xiaomi/mimo-v2-flash:free",           // ← بديل سريع
        "qwen/qwen-2.5-72b-instruct:free"      // ← احتياطي دقيق
      ];
    }
    
    // للشرح العادي - دقة عالية
    return [
      "qwen/qwen-2.5-72b-instruct:free",       // ← الأدق بالحسابات
      "google/gemini-2.0-flash-exp:free",      // ← سريع وجيد
      "google/gemma-3-27b-it:free"             // ← احتياطي
    ];
  }
  
  // ============================================================
  // نماذج الكيمياء
  // ============================================================
  private getChemistryModels(mode: Mode): string[] {
    if (mode === "exam" || mode === "quick") {
      return [
        "google/gemini-2.0-flash-exp:free",    // ← سريع + جيد بالمعادلات
        "qwen/qwen-2.5-72b-instruct:free",     // ← دقيق
        "google/gemma-3-27b-it:free"
      ];
    }
    
    return [
      "google/gemini-2.0-flash-exp:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "google/gemma-3-27b-it:free"
    ];
  }
  
  // ============================================================
  // نماذج الأحياء
  // ============================================================
  private getBiologyModels(mode: Mode): string[] {
    return [
      "google/gemini-2.0-flash-exp:free",      // ← جيد بالتصنيفات
      "qwen/qwen-2.5-72b-instruct:free",       // ← تفصيل جيد
      "google/gemma-3-27b-it:free"
    ];
  }
  
  // ============================================================
  // نماذج اللغة العربية
  // ============================================================
  private getArabicModels(mode: Mode): string[] {
    return [
      "qwen/qwen-2.5-72b-instruct:free",       // ← ممتاز بالعربي والنحو
      "google/gemma-3-27b-it:free",            // ← جيد بالإعراب
      "google/gemini-2.0-flash-exp:free"
    ];
  }
  
  // ============================================================
  // نماذج اللغة الإنجليزية
  // ============================================================
  private getEnglishModels(mode: Mode): string[] {
    return [
      "qwen/qwen-2.5-72b-instruct:free",       // ← ممتاز باللغة
      "google/gemini-2.0-flash-exp:free",
      "google/gemma-3-27b-it:free"
    ];
  }
  
  // ============================================================
  // النماذج الافتراضية
  // ============================================================
  private getDefaultModels(mode: Mode): string[] {
    if (mode === "exam" || mode === "quick") {
      return [
        "google/gemini-2.0-flash-exp:free",
        "xiaomi/mimo-v2-flash:free",
        "qwen/qwen-2.5-72b-instruct:free"
      ];
    }
    
    return [
      "google/gemini-2.0-flash-exp:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "google/gemma-3-27b-it:free"
    ];
  }
  
  // ============================================================
  // Helper functions
  // ============================================================
  private isMathOrPhysics(subject: string): boolean {
    return subject.includes('math') || 
           subject.includes('رياضيات') ||
           subject.includes('physics') ||
           subject.includes('فيزياء');
  }
  
  private isChemistry(subject: string): boolean {
    return subject.includes('chemistry') || 
           subject.includes('كيمياء');
  }
  
  private isBiology(subject: string): boolean {
    return subject.includes('biology') || 
           subject.includes('أحياء') ||
           subject.includes('احياء');
  }
  
  private isArabic(subject: string): boolean {
    return subject.includes('arabic') || 
           subject.includes('عربي');
  }
  
  private isEnglish(subject: string): boolean {
    return subject.includes('english') || 
           subject.includes('انجليزي') ||
           subject.includes('إنجليزي');
  }
  
  /**
   * معلومات عن النموذج المختار
   */
  getModelInfo(modelName: string): ModelConfig | undefined {
    return MODELS[modelName];
  }
  
  /**
   * اقتراح النموذج الأفضل مع السبب
   */
  recommendModel(
    subject: string,
    mode: Mode = "normal"
  ): { model: string; reason: string } {
    const models = this.selectModels(subject, mode);
    const topModel = models[0];
    const info = this.getModelInfo(topModel);
    
    let reason = "";
    
    if (mode === "exam" || mode === "quick") {
      reason = `اخترنا ${info?.name} لأنه ${info?.strengths[0]} - مناسب للوضع السريع`;
    } else {
      reason = `اخترنا ${info?.name} لأنه ${info?.strengths.join('، ')}`;
    }
    
    return {
      model: topModel,
      reason
    };
  }
}

// ============================================================
// Export singleton instance
// ============================================================
export const smartModelSelector = new SmartModelSelector();

// ============================================================
// مثال على الاستخدام
// ============================================================
/*
// في ملف الـ API:

import { smartModelSelector } from './smartModelSelector';

async function generateExplanation(
  subject: string,
  question: string,
  isExamMode: boolean = false
) {
  // اختار أفضل النماذج
  const mode = isExamMode ? "exam" : "normal";
  const models = smartModelSelector.selectModels(subject, mode);
  
  // جرب النماذج بالترتيب
  for (const model of models) {
    try {
      const response = await callAI(model, question);
      if (response) {
        console.log(`✅ نجح مع: ${model}`);
        return response;
      }
    } catch (error) {
      console.log(`❌ فشل مع: ${model}`);
      continue; // جرب التالي
    }
  }
  
  throw new Error("كل النماذج فشلت");
}

// عرض النموذج المختار مع السبب
const recommendation = smartModelSelector.recommendModel("رياضيات", "exam");
console.log(recommendation);
// Output: {
//   model: "google/gemini-2.0-flash-exp:free",
//   reason: "اخترنا Gemini Flash 2.0 لأنه سريع جداً - مناسب للوضع السريع"
// }
*/