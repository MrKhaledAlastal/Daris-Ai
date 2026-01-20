// src/lib/embeddings.ts
import { pipeline } from '@xenova/transformers';

const MULTILINGUAL_MODEL = 'Xenova/multilingual-e5-small';
let freeEmbedder: any = null;

// تطبيع النص العربي: سر الدقة في المحتوى العربي
function normalizeArabicText(text: string): string {
    return text
        .replace(/[\u0617-\u061A\u064B-\u0652]/g, '') // حذف التشكيل
        .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
        .replace(/ى/g, 'ي') // توحيد الياء
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))) // تحويل الأرقام
        .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
        .trim();
}

async function generateFreeEmbedding(text: string, isQuery: boolean): Promise<number[]> {
    if (!freeEmbedder) {
        freeEmbedder = await pipeline('feature-extraction', MULTILINGUAL_MODEL);
    }

    // 🔥 مهم جداً لموديل E5: إضافة 'query: ' للسؤال و 'passage: ' للنص المخزن
    const prefix = isQuery ? 'query: ' : 'passage: ';
    const cleanText = normalizeArabicText(text);
    const finalText = `${prefix}${cleanText}`;

    const output = await freeEmbedder(finalText, {
        pooling: 'mean',
        normalize: true,
    });

    return Array.from(output.data);
}

// ============================================
// 📚 دوال مُصدّرة (Exported Functions)
// ============================================

/**
 * 🔍 دالة لتوليد embedding للبحث (queries)
 * تُستخدم عند البحث في الكتب
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Query text is empty');
    }
    return generateFreeEmbedding(text.substring(0, 1000), true);
}

/**
 * 📄 دالة لتوليد embedding للمحتوى (passages)
 * تُستخدم عند حفظ صفحات الكتب في قاعدة البيانات
 */
export async function generatePassageEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Passage text is empty');
    }
    return generateFreeEmbedding(text.substring(0, 1000), false);
}

/**
 * ✅ دالة عامة للتوافق مع الكود القديم
 * تُستخدم في route.ts عند معالجة الكتب
 * 
 * @param text - النص المراد تحويله لـ embedding
 * @returns embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Text is empty');
    }
    // استخدم passage embedding لأن هذا محتوى بيتحفظ في DB
    return generatePassageEmbedding(text);
}

/**
 * 🔧 دالة مع تحديد النوع (query أو passage)
 * للاستخدامات المتقدمة
 */
export async function generateEmbeddingWithType(text: string, isQuery: boolean): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Text is empty');
    }
    return generateFreeEmbedding(text.substring(0, 1000), isQuery);
}