'use server';

import { answerStudyQuestion, AnswerStudyQuestionInput } from '@/ai/flows/answer-study-questions';
import { collection, getDocs, query, where, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/components/chat/chat-interface';

// ===== تحويل التاريخ =====
function convertHistoryToAiFormat(history: Message[]) {
  return history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    content: msg.content,
  }));
}

// ===== إنشاء محادثة جديدة =====
async function createChat(userId: string, firstMessage: string) {
  const newChatRef = doc(collection(db, 'chats'));

  await setDoc(newChatRef, {
    userId,
    title: firstMessage.substring(0, 40),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newChatRef.id;
}

// ===== حفظ رسالة في المحادثة =====
async function saveMessage(chatId: string, role: string, content: string) {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  await addDoc(messagesRef, {
    role,
    content,
    createdAt: serverTimestamp(),
  });

  // تحديث الشات
  const chatRef = doc(db, 'chats', chatId);
  await setDoc(
    chatRef,
    {
      updatedAt: serverTimestamp(),
      title: content.substring(0, 40),
    },
    { merge: true }
  );
}

// ==================================================================
//                     الدالة الرئيسية askQuestionAction
// ==================================================================
export async function askQuestionAction(args: {
  question: string;
  expandSearchOnline: boolean;
  language: 'en' | 'ar';
  userId?: string;
  imageDataUri?: string | null;
  history: Message[];
  chatId?: string | null;       // ⭐ تمت إضافتها لنستمر بنفس المحادثة
}) {
  const { question, expandSearchOnline, language, userId, imageDataUri, history, chatId } = args;

  // ---------------------- تجهيز الكتب ----------------------
  let textbookContent =
    "No textbook content available for anonymous users. Please log in to use your uploaded books.";
  let availableBooks: { id: string; fileName: string }[] = [];

  if (userId) {
    const booksQuery = query(
      collection(db, 'books'),
      where('userId', '==', userId),
      where('status', '==', 'analyzed')
    );

    const querySnapshot = await getDocs(booksQuery);

    if (!querySnapshot.empty) {
      availableBooks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        fileName: doc.data().fileName,
      }));

      const bookTitles = availableBooks.map(b => b.fileName).join(', ');
      textbookContent = `Content available from: ${bookTitles}. Use it as your primary source.`;
    }
  }

  // ---------------------- تجهيز الإدخال لـ Gemini ----------------------
  const input: AnswerStudyQuestionInput = {
    question,
    textbookContent,
    availableBooks,
    expandSearchOnline,
    language,
    history: convertHistoryToAiFormat(history), // ⭐ نرسل كل الهستوري
    ...(imageDataUri && { imageDataUri }),
  };

  try {
    // ============= الحصول على الإجابة =============
    const output = await answerStudyQuestion(input);

    let finalChatId = chatId;

    // ============= لو مافي chatId → أنشئ واحد =============
    if (userId) {
      if (!chatId) {
        finalChatId = await createChat(userId, question);
      }

      // ============= حفظ الرسائل =============
      await saveMessage(finalChatId!, 'user', question);
      await saveMessage(finalChatId!, 'assistant', output.answer);
    }

    return {
      answer: output.answer,
      source: output.source,
      sourceBookName: output.sourceBookName,
      chatId: finalChatId ?? null,
    };
  } catch (error: any) {
    console.error('Error in Genkit flow:', error);
    return {
      answer: `An error occurred while processing the question: ${error.message}`,
      source: 'error',
      chatId,
    };
  }
}
