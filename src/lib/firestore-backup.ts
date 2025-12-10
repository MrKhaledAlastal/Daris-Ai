// ⚠️ This file is deprecated and kept for reference only
// Use src/lib/supabase-db.ts instead for all database operations

import { db } from "./firebase";
import {
  doc,
  setDoc,
  addDoc,
  getDocs,
  collection,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc
} from "firebase/firestore";

// DEPRECATED: Use saveUser from supabase-db.ts
export async function saveUser(user: any) {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);

  // نقرأ بيانات المستخدم الحالية
  const existing = await getDoc(userRef);

  // إذا لا يوجد مستخدم → أنشئه مع حقل role
  if (!existing.exists()) {
    await setDoc(userRef, {
      email: user.email || "",
      name: user.displayName || "مستخدم جديد",
      role: "student",  // ← كل المستخدمين الجدد طلاب
      lastLogin: serverTimestamp(),
    });
  }

  // إذا موجود → حدّث وقت تسجيل الدخول فقط
  else {
    await setDoc(
      userRef,
      {
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );
  }
}


// DEPRECATED: Use createChat from supabase-db.ts
export async function createChat(userId: string, firstMessage?: string) {
  const chatsRef = collection(db, "users", userId, "chats");

  const hasMessage = Boolean(firstMessage?.trim());
  const safeTitle = hasMessage ? firstMessage!.substring(0, 50) : "New chat";
  const preview = hasMessage ? firstMessage!.substring(0, 80) : "";

  const chatDoc = await addDoc(chatsRef, {
    title: safeTitle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: preview,
  });

  return chatDoc.id;
}

export type ChatMessagePayload = {
  role: "user" | "assistant";
  content: string;
  imageDataUri?: string | null;

  fileUrl?: string | null;  // ملف من Supabase
  fileName?: string | null; // اسم الملف

  source?: string;
  sourceBookName?: string;
  sourcePageNumber?: number;
  lang?: "ar" | "en";
};

// DEPRECATED: Use saveMessage from supabase-db.ts
export async function saveMessage(
  userId: string,
  chatId: string,
  message: ChatMessagePayload
) {
  const messagesRef = collection(
    db,
    "users",
    userId,
    "chats",
    chatId,
    "messages"
  );

  // ✅ احفظ الـ ref في متغير
  const messageRef = await addDoc(messagesRef, {
    role: message.role,
    content: message.content,

    ...(message.imageDataUri && { imageDataUri: message.imageDataUri }),

    ...(message.fileUrl && { fileUrl: message.fileUrl }),
    ...(message.fileName && { fileName: message.fileName }),

    ...(message.source && { source: message.source }),
    ...(message.sourceBookName && { sourceBookName: message.sourceBookName }),
    ...(message.sourcePageNumber && { sourcePageNumber: message.sourcePageNumber }),
    ...(message.lang && { lang: message.lang }),

    createdAt: serverTimestamp(),
  });

  // تحديث بيانات المحادثة
  const chatRef = doc(db, "users", userId, "chats", chatId);

  const update: Record<string, any> = {
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  };

  if (message.content) {
    update.lastMessagePreview = message.content.substring(0, 80);
  }

  if (message.role === "user" && message.content?.trim()) {
    update.title = message.content.substring(0, 50);
  }

  await setDoc(chatRef, update, { merge: true });

  // ✅ ارجع الـ ref اللي فيه الـ id
  return messageRef;
}

// DEPRECATED: Use getUserChats from supabase-db.ts
export async function getUserChats(userId: string) {
  const chatsRef = collection(db, "users", userId, "chats");
  const q = query(chatsRef, orderBy("lastMessageAt", "desc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// DEPRECATED: Use deleteChat from supabase-db.ts
export async function deleteChat(userId: string, chatId: string) {
  await deleteDoc(doc(db, "users", userId, "chats", chatId));
}

// DEPRECATED: Use renameChat from supabase-db.ts
export async function renameChat(userId: string, chatId: string, newTitle: string) {
  await setDoc(
    doc(db, "users", userId, "chats", chatId),
    { title: newTitle, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
