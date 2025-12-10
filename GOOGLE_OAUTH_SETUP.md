# تفعيل Google OAuth في Supabase

## الخطوات المطلوبة:

### 1️⃣ إعداد Google Cloud Console

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ project جديد (أو استخدم الموجود)
3. فعّل **Google+ API**:
   - Search for "Google+ API"
   - Click Enable

### 2️⃣ إنشاء OAuth Credentials

1. اذهب إلى **Credentials** (على اليسار)
2. اضغط **Create Credentials** → **OAuth client ID**
3. اختر **Web application**
4. في **Authorized JavaScript origins** أضف:
   ```
   https://sqddjclnivmgyycgkcbo.supabase.co
   http://localhost:3000 (للـ development)
   ```
5. في **Authorized redirect URIs** أضف:
   ```
   https://sqddjclnivmgyycgkcbo.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (للـ development)
   ```
6. انسخ **Client ID**

### 3️⃣ إضافة Google Provider إلى Supabase

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com/)
2. اختر project الخاص بك
3. اذهب إلى **Authentication** → **Providers**
4. ابحث عن **Google** وفعّله
5. الصق **Google Client ID** في حقل `Client ID`
6. للـ `Client Secret`: من Google Cloud Console انسخ ال Client Secret
7. اضغط **Save**

### 4️⃣ تحديث `.env` (optional):

```env
# Already configured:
NEXT_PUBLIC_SUPABASE_URL=https://sqddjclnivmgyycgkcbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## ✅ التحقق:

بعد تفعيل Google OAuth:

1. افتح التطبيق
2. اضغط على زر "Login with Google"
3. يجب أن تُعاد إلى `/auth/callback` ثم إلى `/chat`

## 🔗 المراجع:

- [Supabase Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud OAuth Guide](https://developers.google.com/identity/protocols/oauth2)

## 📝 الملفات المحدثة:

- ✅ `src/lib/supabase-auth.ts` - أضيفت دالة `signInWithGoogle()`
- ✅ `src/components/auth/login-form.tsx` - تحديث Google Sign-In button
- ✅ `src/app/auth/callback/page.tsx` - صفحة callback جديدة

---

**بعد إتمام الخطوات أعلاه، Google Sign-In سيكون شغال بالكامل!** ✨
