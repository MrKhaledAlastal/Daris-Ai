# 🔧 Fix RLS Policies - الخطوات الحتمية

## المشكلة:

```
❌ 406 (Not Acceptable) - GET users failed
❌ 403 (Forbidden) - INSERT users failed
```

السبب: الـ RLS Policies ناقصة صلاحيات INSERT!

---

## الحل:

### الخطوة 1: روح لـ Supabase Dashboard

```
https://app.supabase.com/project/sqddjclnivmgyycgkcbo
```

### الخطوة 2: روح لـ SQL Editor

```
Dashboard → SQL Editor → New Query
```

### الخطوة 3: انسخ والصق هذا الـ SQL:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create new policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### الخطوة 4: اضغط **Run** ✅

### الخطوة 5: روح للـ App و refresh

---

## بعد الـ Fix:

✅ الـ users table بيقبل INSERT
✅ كل مستخدم بيقدر يقرأ/يكتب ملفه الشخصي
✅ الفرع بينحفظ بنجاح

---

## للتحقق من الـ Policies:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

يجب تشوف 3 policies:

1. ✅ Users can insert their own profile
2. ✅ Users can update their own profile
3. ✅ Users can view their own profile
