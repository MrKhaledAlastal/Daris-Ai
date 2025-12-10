import { supabase } from './supabase';

// ----------------------------------------------------
// saveUser — يمنع تغيير role بعد أول مرة
// ----------------------------------------------------
export async function saveUser(user: any) {
  if (!user?.id) return;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "مستخدم جديد";

  // هل المستخدم موجود أساسًا؟
  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error checking existing user:", fetchError);
    return;
  }

  if (!existing) {
    // مستخدم جديد → نضع student مرة واحدة فقط
    const { error } = await supabase.from("users").insert({
      id: user.id,
      email: user.email || "",
      display_name: displayName,
      role: "student",
      branch: null,
      last_login: new Date().toISOString(),
    });

    if (error) throw error;
  } else {
    // مستخدم موجود → لا نلمس role نهائيًا
    const { error } = await supabase
      .from("users")
      .update({
        email: user.email || "",
        display_name: displayName,
        last_login: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;
  }
}

// ----------------------------------------------------
// Chat Functions
// ----------------------------------------------------

export async function createChat(userId: string, firstMessage?: string) {
  const hasMessage = Boolean(firstMessage?.trim());
  const safeTitle = hasMessage ? firstMessage!.substring(0, 50) : "New chat";
  const preview = hasMessage ? firstMessage!.substring(0, 80) : "";

  const { data, error } = await supabase
    .from("chats")
    .insert({
      user_id: userId,
      title: safeTitle,
      last_message_preview: preview,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id;
}

export type ChatMessagePayload = {
  role: "user" | "assistant";
  content: string;
  imageDataUri?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  source?: string;
  sourceBookName?: string;
  sourcePageNumber?: number;
  lang?: "ar" | "en";
};

export async function saveMessage(
  userId: string,
  chatId: string,
  message: ChatMessagePayload
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      user_id: userId,
      role: message.role,
      content: message.content,
      image_data_uri: message.imageDataUri,
      file_url: message.fileUrl,
      file_name: message.fileName,
      source: message.source,
      source_book_name: message.sourceBookName,
      source_page_number: message.sourcePageNumber,
      lang: message.lang,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;

  // تحديث الـ Chat
  const preview = message.content?.substring(0, 80) || "";
  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
    last_message_preview: preview,
  };

  if (message.role === "user" && message.content?.trim()) {
    update.title = message.content.substring(0, 50);
  }

  const { error: updateError } = await supabase
    .from("chats")
    .update(update)
    .eq("id", chatId);

  if (updateError) throw updateError;

  return data;
}

export async function getUserChats(userId: string) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteChat(userId: string, chatId: string) {
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function renameChat(
  userId: string,
  chatId: string,
  newTitle: string
) {
  const { error } = await supabase
    .from("chats")
    .update({
      title: newTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getMessages(chatId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) throw error;
}

// ----------------------------------------------------
// REALTIME
// ----------------------------------------------------

export function subscribeToMessages(
  chatId: string,
  callback: (payload: any) => void
) {
  const subscription = supabase
    .channel(`messages:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => subscription.unsubscribe();
}

export function subscribeToChats(
  userId: string,
  callback: (payload: any) => void
) {
  const subscription = supabase
    .channel(`chats:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chats",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => subscription.unsubscribe();
}
