"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Book,
  Bot,
  LogIn,
  LogOut,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Languages,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../icons/logo";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "../ui/button";

export default function MainSidebar() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useAuth();
  const { t, lang, setLanguage, dir } = useLanguage();
  const router = useRouter();
  const { setTheme } = useTheme();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/chat");
  };

  const handleNewChat = () => {
    // In a future step, this will clear the current chat and create a new one.
    router.push("/chat");
  };

  const getAvatarFallback = (name: string | null | undefined) => {
    if (!name) return <UserIcon />;
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <Logo className="h-10 w-auto text-primary" />
      </SidebarHeader>
      <SidebarContent>
        {isLoggedIn && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewChat} tooltip="New Chat">
                  <PlusCircle />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Chat history will be rendered here */}
              <p className="p-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                Your recent chats will appear here.
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/chat" passHref legacyBehavior={false}>
              <SidebarMenuButton
                isActive={pathname.startsWith("/chat")}
                tooltip={t["chat"]}
              >
                <Bot />
                <span>{t["chat"]}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton tooltip="Change Theme">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span>{t.theme}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                {t.light}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                {t.dark}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                {t.system}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton tooltip="Change Language">
                <Languages />
                <span>{t.language}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem
                onClick={() => setLanguage("en")}
                disabled={lang === "en"}
              >
                {t.english}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage("ar")}
                disabled={lang === "ar"}
              >
                {t.arabic}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenu>
        <SidebarSeparator />
        {isLoggedIn && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-12 w-full flex justify-start items-center p-2 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.photoURL ?? undefined}
                    alt={user.displayName ?? "User"}
                  />
                  <AvatarFallback>
                    {getAvatarFallback(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="ms-3 text-left group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-foreground">
                    {user.displayName ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
              <DropdownMenuLabel>
                {user.displayName ?? "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.logout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/login" passHref legacyBehavior={false}>
                <SidebarMenuButton tooltip={t.login}>
                  <LogIn />
                  <span>{t.login}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
