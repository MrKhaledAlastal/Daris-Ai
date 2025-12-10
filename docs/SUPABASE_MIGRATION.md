# Supabase Migration Guide - Firebase إلى Supabase

## الخطوات:

### 1️⃣ إنشاء Supabase Project

- اذهب إلى [supabase.com](https://supabase.com)
- أنشئ project جديد
- احفظ:
  - **URL**: `https://your-project.supabase.co`
  - **Anon Key**: من Settings → API

### 2️⃣ أضف المتغيرات إلى `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3️⃣ قم بتشغيل Schema SQL

- اذهب إلى Supabase Dashboard → SQL Editor
- انسخ محتوى `docs/supabase-schema.sql`
- الصقه وقم بـ Run

### 4️⃣ تحديث الـ Code

#### في `src/contexts/auth-provider.tsx`:

```tsx
// قديم:
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

// جديد:
import { onAuthStateChange } from "@/lib/supabase-auth";
import { supabaseAuth } from "@/lib/supabase-auth";
import { saveUser } from "@/lib/supabase-db";

// في useEffect:
const unsubscribe = onAuthStateChange(async (user) => {
  if (user) {
    setUser(user);
    await saveUser(user);
  } else {
    setUser(null);
  }
  setLoading(false);
});
```

#### في `src/app/actions.ts`:

```tsx
// قديم:
import { saveMessage, saveUser } from "@/lib/firestore";
import { createChat, getUserChats } from "@/lib/firestore";

// جديد:
import {
  saveMessage,
  saveUser,
  createChat,
  getUserChats,
} from "@/lib/supabase-db";
```

#### في `src/components/chat/chat-interface.tsx`:

```tsx
// قديم:
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// جديد:
import { subscribeToMessages } from "@/lib/supabase-db";

// في useEffect (للـ messages listener):
const unsubscribe = subscribeToMessages(currentChatId, (payload) => {
  // Handle real-time updates
  refreshMessages();
});
```

#### في `src/app/(app)/my-books/page.tsx`:

```tsx
// قديم:
import { getUserChats } from "@/lib/firestore";

// جديد:
import { getUserChats } from "@/lib/supabase-db";
```

### 5️⃣ Migration من Firebase إلى Supabase (اختياري)

إذا كان عندك بيانات قديمة في Firebase وتريد نقلها:

```typescript
// script للـ migration (في مشروع Node.js منفصل):
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const firebaseApp = admin.initializeApp({...});
const db = admin.firestore();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateData() {
  const users = await db.collection('users').get();

  for (const userDoc of users.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Insert user
    await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        display_name: userData.name,
      });

    // Migrate chats
    const chats = await db.collection('users').doc(userId).collection('chats').get();

    for (const chatDoc of chats.docs) {
      const chatData = chatDoc.data();
      const { data: newChat } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: chatData.title,
          created_at: chatData.createdAt?.toDate().toISOString(),
        })
        .select()
        .single();

      // Migrate messages
      const messages = await chatDoc.ref.collection('messages').get();

      for (const msgDoc of messages.docs) {
        const msgData = msgDoc.data();
        await supabase
          .from('messages')
          .insert({
            chat_id: newChat.id,
            user_id: userId,
            role: msgData.role,
            content: msgData.content,
            created_at: msgData.createdAt?.toDate().toISOString(),
          });
      }
    }
  }
}

migrateData();
```

### 6️⃣ Storage للصور والملفات

#### في الـ upload code:

```typescript
// قديم:
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// جديد:
import { supabaseAuth } from "@/lib/supabase-auth";

async function uploadImage(userId: string, file: File) {
  const fileName = `${userId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabaseAuth.storage
    .from("tawjihi-files")
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrl } = supabaseAuth.storage
    .from("tawjihi-files")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}
```

### 7️⃣ Realtime Subscriptions

```typescript
// قديم:
import { onSnapshot } from 'firebase/firestore';

onSnapshot(query(...), (snapshot) => {
  // ...
});

// جديد:
import { subscribeToMessages } from '@/lib/supabase-db';

const unsubscribe = subscribeToMessages(chatId, (payload) => {
  if (payload.eventType === 'INSERT') {
    // new message
  }
});
```

## الفوائد بعد الـ Migration:

✅ **أرخص**: 70% أقل تكلفة  
✅ **أسرع**: PostgreSQL أقوى من Firestore  
✅ **أسهل**: SQL queries بدل الحد من NoSQL  
✅ **Realtime مدمج**: بدون تعقيدات  
✅ **Auth مدمج**: نفس الـ features

## الدعم:

- Supabase Docs: https://supabase.com/docs
- Discord Community: https://discord.supabase.io
