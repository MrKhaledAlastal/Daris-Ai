import { db } from "./firebase";
import {
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

// حفظ المستخدم (يُستدعى أول مرة عند تسجيل الدخول)
export async function saveUser(user: any) {
  if (!user?.uid) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      email: user.email || "",
      name: user.displayName || "مستخدم جديد",
      lastLogin: serverTimestamp(),
    },
    { merge: true }
  );
}

// إنشاء محادثة جديدة
export async function createChat(userId: string, firstMessage: string) {
  const chatsRef = collection(db, "users", userId, "chats");
  const chatDoc = await addDoc(chatsRef, {
    title: firstMessage.substring(0, 50),
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  });
  return chatDoc.id;
}

// حفظ رسالة داخل محادثة
export async function saveMessage(userId: string, chatId: string, message: any) {
  const messagesRef = collection(db, "users", userId, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    ...message,
    createdAt: serverTimestamp(),
  });
}

// جلب جميع المحادثات للمستخدم
export async function getUserChats(userId: string) {
  const chatsRef = collection(db, "users", userId, "chats");
  const q = query(chatsRef, orderBy("lastMessageAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
