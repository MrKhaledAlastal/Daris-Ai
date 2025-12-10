# إصلاح مشكلة حفظ الفرع الدراسي

## المشكلة:

الـ `branch` column ناقص من جدول `users` في Supabase.

## الحل:

### الخطوة 1: اذهب إلى Supabase Dashboard

1. افتح [Supabase Dashboard](https://app.supabase.com/)
2. اختر project الخاص بك

### الخطوة 2: فتح SQL Editor

1. اذهب إلى **SQL Editor** (على اليسار)
2. اضغط **New Query**

### الخطوة 3: تنفيذ Migration

انسخ الكود هاي والصقه في SQL Editor:

```sql
-- Add branch column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS branch TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
```

اضغط **Run** وخلصنا! ✅

## بعدها:

جرّب اختيار الفرع مرة تانية وسيشتغل تمام! 🎯

---

**ملاحظة:** الـ SQL كود آمن ١٠٠% - إذا كان الـ column موجود بالفعل، ما حيعمل حاجة.
