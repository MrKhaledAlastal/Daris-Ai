"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue } from "react";
import Image from "next/image";
import { signOut } from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { BRANCHES } from "@/constants/branches";
import { BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { translations } from "@/lib/translations";
import {
  Edit2,
  LogOut,
  Menu,
  Moon,
  MoreVertical,
  PanelLeft,
  Plus,
  Search,
  Sun,
  Trash2,
  ShieldCheck,
} from "lucide-react";

// Import separated components (create these files)
// import { UserProfile } from "./UserProfile";
// import { ChatList } from "./ChatList";
// import { RenameDialog } from "./RenameDialog";
// import { useChats } from "@/hooks/useChats";

// Temporary imports until you create the files
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ChatPreview = {
  id: string;
  title: string;
  lastMessagePreview?: string;
};

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
  },
] as const;

const LANGUAGE_OPTIONS = [
  {
    value: "en",
    label: "English",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-black uppercase">
        EN
      </span>
    ),
  },
  {
    value: "ar",
    label: "العربية",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-base font-black">
        ع
      </span>
    ),
  },
] as const;

export default function MainSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, branch, displayName } = useAuth();
  const { isAdmin } = useAdmin();
  const { lang, setLanguage } = useLanguage();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const t = translations[lang as keyof typeof translations];

  // Mobile off-canvas state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const activeChatId = searchParams.get("chatId");

  // Chats state (replace with useChats hook later)
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Fetch chats
  useEffect(() => {
    if (!user?.id) {
      setChats([]);
      return;
    }

    const fetchChats = async () => {
      try {
        setChatsLoading(true);
        const { getUserChats } = await import("@/lib/supabase-db");
        const fetchedChats = await getUserChats(user.id);
        setChats(
          fetchedChats.map((chat: any) => ({
            id: chat.id,
            title: chat.title || "New chat",
            lastMessagePreview: chat.last_message_preview,
          }))
        );
      } catch (error) {
        // console.error("Error fetching chats:", error);
      } finally {
        setChatsLoading(false);
      }
    };

    fetchChats();

    // Set up real-time subscription with unique channel name per user
    const channelName = `sidebar-chats-${user.id}-${Date.now()}`;
    console.log("🔔 Setting up chats subscription:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔄 Chat change detected:", payload.eventType, payload);

          if (payload.eventType === "INSERT") {
            const newChat = payload.new as any;
            console.log("➕ New chat created:", newChat);
            setChats((prev) => {
              // Check if chat already exists
              const exists = prev.some((c) => c.id === newChat.id);
              if (exists) return prev;

              // Add new chat at the beginning
              return [
                {
                  id: newChat.id,
                  title: newChat.title || "New chat",
                  lastMessagePreview: newChat.last_message_preview,
                },
                ...prev,
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedChat = payload.new as any;
            console.log("✏️ Chat updated:", updatedChat);
            setChats((prev) =>
              prev.map((c) =>
                c.id === updatedChat.id
                  ? {
                    ...c,
                    title: updatedChat.title || c.title,
                    lastMessagePreview: updatedChat.last_message_preview,
                  }
                  : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedChat = payload.old as any;
            console.log("🗑️ Chat deleted:", deletedChat);
            setChats((prev) => prev.filter((c) => c.id !== deletedChat.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
      });

    return () => {
      console.log("🔕 Unsubscribing from chats:", channelName);
      channel.unsubscribe();
    };
  }, [user?.id]);

  // 🔥 Listen for custom event when new chat is created (fallback for Realtime)
  useEffect(() => {
    const handleNewChat = (event: CustomEvent) => {
      const newChat = event.detail;
      console.log("🔔 New chat event received:", newChat);

      setChats((prev) => {
        // Check if chat already exists
        const exists = prev.some((c) => c.id === newChat.id);
        if (exists) return prev;

        // Add new chat at the beginning
        return [
          {
            id: newChat.id,
            title: newChat.title || "New chat",
            lastMessagePreview: newChat.lastMessagePreview || "",
          },
          ...prev,
        ];
      });
    };

    // 🔥 Listen for chat title updates
    const handleTitleUpdate = (event: CustomEvent) => {
      const { id, title, lastMessagePreview } = event.detail;
      console.log("✏️ Chat title update received:", id, title);

      setChats((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
              ...c,
              title: title || c.title,
              lastMessagePreview: lastMessagePreview || c.lastMessagePreview,
            }
            : c
        )
      );
    };

    window.addEventListener("newChatCreated", handleNewChat as EventListener);
    window.addEventListener("chatTitleUpdated", handleTitleUpdate as EventListener);

    return () => {
      window.removeEventListener("newChatCreated", handleNewChat as EventListener);
      window.removeEventListener("chatTitleUpdated", handleTitleUpdate as EventListener);
    };
  }, []);

  const refetchChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { getUserChats } = await import("@/lib/supabase-db");
      const fetchedChats = await getUserChats(user.id);
      setChats(
        fetchedChats.map((chat: any) => ({
          id: chat.id,
          title: chat.title || "New chat",
          lastMessagePreview: chat.last_message_preview,
        }))
      );
    } catch (error) {
      console.error("Error refetching chats:", error);
    }
  }, [user?.id]);

  // Memoized sidebar width
  const sidebarWidth = useMemo(
    () => (isMobile ? 320 : isCollapsed ? 64 : 280),
    [isMobile, isCollapsed]
  );

  // Update CSS variable for sidebar offset
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (isMobile) {
      root.style.setProperty("--sidebar-offset", "0px");
    } else {
      root.style.setProperty("--sidebar-offset", `${sidebarWidth}px`);
    }

    return () => {
      root.style.setProperty("--sidebar-offset", "0px");
    };
  }, [isMobile, sidebarWidth]);

  // Memoized handlers
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  const handleLogoClick = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isCollapsed]);

  const handleCollapseClick = useCallback(() => {
    if (isMobile) {
      closeMobile();
      return;
    }
    setIsCollapsed(true);
  }, [isMobile, closeMobile]);

  const handleBranchChange = useCallback(
    async (newBranch: string) => {
      if (!user?.id) return;
      try {
        const { error } = await supabase
          .from("users")
          .update({ branch: newBranch })
          .eq("id", user.id);

        if (error) throw error;
        window.location.reload();
      } catch (error) {
        console.error("Failed to update branch:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update branch.",
        });
      }
    },
    [user?.id, toast]
  );

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  // Body scroll lock for mobile sidebar
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Filtered chats with deferred search
  const filteredChats = useMemo(() => {
    if (!deferredSearchTerm.trim()) return chats;
    const lower = deferredSearchTerm.toLowerCase();
    return chats.filter((chat) => chat.title.toLowerCase().includes(lower));
  }, [chats, deferredSearchTerm]);

  const handleNewChat = useCallback(async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    try {
      setIsCreatingChat(true);
      const { createChat } = await import("@/lib/supabase-db");
      const chatId = await createChat(user.id);

      // 🔥 Add new chat to list immediately
      const newChat = {
        id: chatId,
        title: "New chat",
        lastMessagePreview: "",
      };

      setChats((prev) => {
        // Check if already exists
        const exists = prev.some((c) => c.id === chatId);
        if (exists) return prev;
        return [newChat, ...prev];
      });

      router.push(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create a new chat.",
      });
    } finally {
      setIsCreatingChat(false);
      closeMobile();
    }
  }, [user?.id, router, toast, closeMobile]);

  const handleOpenChat = useCallback(
    (id: string) => {
      router.push(`/chat?chatId=${id}`);
      closeMobile();
    },
    [router, closeMobile]
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      if (!user?.id) return;
      try {
        const { deleteChat } = await import("@/lib/supabase-db");
        await deleteChat(user.id, chatId);
        toast({
          title: "Chat deleted",
          description: "The conversation has been deleted.",
        });
        refetchChats();
      } catch (error) {
        console.error("Error deleting chat:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete chat.",
        });
      }
    },
    [user?.id, toast, refetchChats]
  );

  const handleRenameChat = useCallback(async () => {
    if (!user?.id || !renamingChatId || !tempTitle.trim()) return;
    try {
      const { renameChat } = await import("@/lib/supabase-db");
      await renameChat(user.id, renamingChatId, tempTitle.trim());
      setRenamingChatId(null);
      setTempTitle("");
      setIsRenameDialogOpen(false);
      toast({
        title: "Chat renamed",
        description: "The conversation has been renamed.",
      });
      refetchChats();
    } catch (error) {
      console.error("Error renaming chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to rename chat.",
      });
    }
  }, [user?.id, renamingChatId, tempTitle, toast, refetchChats]);

  const handleOpenRenameDialog = useCallback(
    (chatId: string, chatTitle: string) => {
      setRenamingChatId(chatId);
      setTempTitle(chatTitle);
      setIsRenameDialogOpen(true);
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, [router]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={openMobile}
        aria-label="Open sidebar"
        className={cn(
          "fixed top-4 left-4 z-50 p-2 rounded-md border border-border/60 bg-background/80 backdrop-blur-md text-foreground shadow-sm md:hidden"
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-[2px] md:hidden"
          onClick={closeMobile}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "relative h-[100dvh] md:h-screen shrink-0 border-r border-border bg-background flex flex-col shadow-[0_20px_80px_rgba(0,0,0,0.35)]",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:sticky md:top-0 md:flex md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          width: sidebarWidth,
          transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: isMobile ? "auto" : "hidden",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogoClick}
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg group/logo transition-all",
                isCollapsed ? "cursor-pointer" : "cursor-default"
              )}
              aria-label={isCollapsed ? "Open sidebar" : t.appName}
            >
              <Image
                src="/logo.png"
                alt={t.appName}
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
              {isCollapsed && (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/80 text-background opacity-0 transition-opacity group-hover/logo:opacity-100">
                  <PanelLeft size={16} />
                </span>
              )}
            </button>
          </div>
          {!isCollapsed && (
            <button
              onClick={handleCollapseClick}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all"
              aria-label={isMobile ? "Close sidebar" : "Collapse sidebar"}
            >
              <PanelLeft size={16} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col px-2 pt-3 gap-px">
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className={cn(
              "inline-flex items-center justify-center relative w-full gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-foreground",
              "transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] active:scale-[0.985] hover:bg-accent/10 active:bg-accent/20",
              isCreatingChat && "opacity-70 cursor-not-allowed"
            )}
            aria-label={t.newChat}
            aria-busy={isCreatingChat}
          >
            <div className="-translate-x-1 w-full flex flex-row items-center justify-start gap-3">
              <div className="flex items-center justify-center text-primary-foreground">
                <div className="flex items-center justify-center rounded-full size-[1.5rem] bg-primary text-primary-foreground border border-border/40 shadow-sm group-hover:-rotate-3 group-hover:scale-105 group-active:rotate-3 group-active:scale-[0.98] transition-all duration-150 ease-in-out">
                  <Plus size={20} className="shrink-0" />
                </div>
              </div>
              <span
                className="truncate text-sm whitespace-nowrap flex-1 text-left transition-all duration-200"
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : "auto",
                  display: "inline-block",
                }}
              >
                {isCreatingChat ? t.loading : t.newChat}
              </span>
            </div>
          </button>

          {/* Admin Panel Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                router.push("/admin/books");
                closeMobile();
              }}
              className={cn(
                "inline-flex items-center justify-center relative w-full gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-foreground mt-1",
                "transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] active:scale-[0.985] hover:bg-primary/10 active:bg-primary/20"
              )}
              aria-label="Admin Panel"
            >
              <div className="-translate-x-1 w-full flex flex-row items-center gap-3">
                <div className="flex items-center justify-center text-primary-foreground">
                  <div className="flex items-center justify-center rounded-full size-[1.5rem] bg-primary text-primary-foreground border border-border/40 shadow-sm transition-all">
                    <ShieldCheck size={18} className="shrink-0" />
                  </div>
                </div>
                {!isCollapsed && (
                  <span className="truncate text-sm whitespace-nowrap flex-1 text-left">
                    لوحة الأدمن
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden px-2">
              <div className="flex items-center justify-between pt-4 pb-2">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  {t.recentChats}
                </h3>
              </div>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t.searchChats}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border/50 px-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label={t.searchChats}
                />
              </div>

              {/* Chats List */}
              <ul className="flex-1 overflow-y-auto space-y-1 pb-3 pe-2 md:pe-0">
                {chatsLoading ? (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t.loading || "Loading..."}
                  </li>
                ) : filteredChats.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground bg-background/30 rounded-lg">
                    {t.noChatsFound}
                  </li>
                ) : (
                  filteredChats.map((chat) => (
                    <RecentChatButton
                      key={chat.id}
                      id={chat.id}
                      title={chat.title}
                      active={activeChatId === chat.id}
                      onClick={() => handleOpenChat(chat.id)}
                      onDelete={() => handleDeleteChat(chat.id)}
                      onRenameStart={() =>
                        handleOpenRenameDialog(chat.id, chat.title)
                      }
                    />
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* User Profile Section */}
        <div className="mt-auto w-full px-3 py-2 space-y-2 border-t border-border/60">
          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 rounded-lg px-0 py-2 transition-all group">
                  <Avatar className="h-9 w-9 shrink-0 border border-white/10 group-hover:scale-[1.05] transition-transform duration-300">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url || undefined}
                      alt={user.user_metadata?.display_name || t.appName}
                    />
                    <AvatarFallback className="bg-accent/30 text-sm font-semibold">
                      {displayName?.slice(0, 2)?.toUpperCase() ||
                        user.email?.slice(0, 2)?.toUpperCase() ||
                        "UA"}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className="flex-1 min-w-0 text-left overflow-hidden"
                    style={{
                      opacity: isCollapsed ? 0 : 1,
                      transition: "opacity 150ms ease-in-out",
                      width: isCollapsed ? 0 : "auto",
                    }}
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 bg-background border border-border/60 text-foreground"
              >
                <div className="space-y-4 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-accent/30 text-base">
                        {user.user_metadata?.display_name?.[0] ||
                          user.email?.[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user.user_metadata?.display_name || "User"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {lang === "ar" ? "الفرع الدراسي" : "Study Branch"}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {BRANCHES.map((b) => (
                        <ControlButton
                          key={b.id}
                          icon={<BookOpenCheck className="h-4 w-4" />}
                          label={lang === "ar" ? b.label.ar : b.label.en}
                          active={branch === b.id}
                          collapsed={false}
                          onClick={() => handleBranchChange(b.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t.theme}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {THEME_OPTIONS.map(({ value, label, icon }) => (
                        <ControlButton
                          key={value}
                          icon={icon}
                          label={label}
                          active={theme === value}
                          collapsed={false}
                          onClick={() => setTheme(value)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t.language}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {LANGUAGE_OPTIONS.map(({ value, label, icon }) => (
                        <ControlButton
                          key={value}
                          icon={icon}
                          label={label}
                          active={lang === value}
                          collapsed={false}
                          onClick={() => setLanguage(value as "en" | "ar")}
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleLogout}
                    className="w-full bg-accent/15 text-foreground hover:bg-accent/30"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.logout}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className={cn(
                "w-full rounded-2xl border border-border/60 bg-background py-2.5 text-sm font-medium text-foreground hover:bg-accent/10 transition-all",
                isCollapsed &&
                "w-full h-10 flex items-center justify-center p-0"
              )}
            >
              {isCollapsed ? "→" : t.login}
            </button>
          )}
        </div>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent className="bg-background border border-border/60 text-foreground">
            <DialogHeader>
              <DialogTitle>{t.renameChat}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                placeholder={t.chatName}
                className="bg-accent/5 border border-border/50 text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameChat();
                  } else if (e.key === "Escape") {
                    setIsRenameDialogOpen(false);
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
                className="border-border/60 text-foreground hover:bg-accent/10"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleRenameChat}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </aside>
    </>
  );
}

// ==================== Sub Components ====================

function RecentChatButton({
  id,
  title,
  active,
  onClick,
  onDelete,
  onRenameStart,
}: {
  id: string;
  title: string;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRenameStart: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={isDeleting}
        className={cn(
          "inline-flex items-center justify-center relative shrink-0 select-none",
          "border-transparent transition-all font-normal duration-150 ease-in-out",
          "h-8 rounded-lg px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap text-xs w-full overflow-hidden",
          "group py-1.5 px-4 hover:bg-accent/50 active:bg-accent active:scale-100",
          active && "bg-accent",
          isDeleting && "opacity-50 cursor-not-allowed"
        )}
        aria-label={`Open chat: ${title}`}
        aria-current={active ? "page" : undefined}
      >
        <div className="flex flex-row items-center justify-start gap-3 w-full -translate-x-2">
          <span
            className={cn(
              "truncate text-sm whitespace-nowrap flex-1 text-left transition-all duration-150",
              "group-hover:[mask-image:linear-gradient(to_right,black_78%,transparent_95%)]",
              active &&
              "[mask-image:linear-gradient(to_right,black_78%,transparent_95%)]"
            )}
          >
            {title}
          </span>
        </div>
      </button>

      {/* Actions Dropdown */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 transition-opacity duration-200 ease-in-out",
          active
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 pointer-events-auto"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-md active:scale-95 hover:bg-accent/40 transition-all duration-150 flex items-center justify-center"
              aria-label={`More options for ${title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-background border border-border/60 text-foreground"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRenameStart();
              }}
              className="cursor-pointer hover:bg-accent/20"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer hover:bg-accent/20 text-red-500 focus:text-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Control Button (Theme / Language / Branch)
function ControlButton({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center rounded-2xl border text-sm font-semibold tracking-wide transition-all",
        active
          ? "border-accent bg-accent/30 text-foreground shadow"
          : "border-border/60 text-muted-foreground hover:border-accent hover:bg-accent/10",
        collapsed
          ? "h-11 w-11 justify-center p-0"
          : "w-full justify-start gap-3 px-4 py-2.5"
      )}
      aria-label={label}
      aria-pressed={active}
    >
      <span className="flex items-center justify-center">{icon}</span>
      {!collapsed && <span>{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-lg bg-black/90 px-3 py-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 z-50">
          {label}
        </span>
      )}
    </button>
  );
}
