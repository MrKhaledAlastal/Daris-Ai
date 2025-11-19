'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { CornerDownLeft, Loader2, User, Bot, Zap, Globe, Book, PenSquare, FileQuestion, Sparkles, Paperclip, Camera, Send, Plus, X, Copy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askQuestionAction } from '@/app/actions';
import { useLanguage } from '@/hooks/use-language';
import { Badge } from '../ui/badge';
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '../icons/logo';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { useSidebar } from '../ui/sidebar';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  sourceBookName?: string;
  image?: string;
}

const examplePrompts = [
    {
        icon: <PenSquare className="w-5 h-5" />,
        title: "Generate practice questions",
        prompt: "Generate 5 medium-difficulty practice questions about biology."
    },
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: "Explain a concept",
        prompt: "Explain the concept of 'photosynthesis' in simple terms."
    }
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [expandSearch, setExpandSearch] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t, lang, dir } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const { state: sidebarState } = useSidebar();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();

  const onFileDrop = (acceptedFiles: File[]) => {
    if (!isLoggedIn) {
        router.push('/login?redirect=/chat');
        return;
    }
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
        // Handle other file types in the future
        toast({
            variant: 'destructive',
            title: 'Unsupported File Type',
            description: `Currently, only image files are supported. You tried to upload: ${file.name}`,
        });
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: onFileDrop,
    noClick: true,
    noKeyboard: true,
  });

  const handleAttachClick = () => {
    if (!isLoggedIn) {
        router.push('/login?redirect=/chat');
    } else {
        open();
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  const sendMessage = () => {
    const messageContent = input.trim();
    if ((!messageContent && !attachedImage) || isPending) return;
  
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      ...(attachedImage && { image: attachedImage }),
    };
  
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedImage(null);
  
    startTransition(async () => {
      const assistantMessagePlaceholder: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };
      setMessages((prev) => [...prev, assistantMessagePlaceholder]);
  
      try {
        const result = await askQuestionAction({
          question: messageContent,
          expandSearchOnline: expandSearch,
          language: lang,
          userId: user?.uid,
          imageDataUri: attachedImage,
          history: newMessages.slice(0, -1) 
        });

        const assistantMessage: Message = {
          id: assistantMessagePlaceholder.id,
          role: 'assistant',
          content: result.answer,
          source: result.source,
          sourceBookName: result.sourceBookName,
        };
        setMessages((prev) => {
          const updatedMessages = [...prev];
          const index = updatedMessages.findIndex(msg => msg.id === assistantMessagePlaceholder.id);
          if (index !== -1) {
            updatedMessages[index] = assistantMessage;
          }
          return updatedMessages;
        });
  
      } catch (error) {
        console.error('Error in Genkit flow:', error);
        const errorMessage: Message = {
          id: assistantMessagePlaceholder.id,
          role: 'assistant',
          content: 'An error occurred. Please try again.',
        };
        setMessages((prev) => {
           const newMessages = [...prev];
          const index = newMessages.findIndex(msg => msg.id === assistantMessagePlaceholder.id);
          if (index !== -1) {
            newMessages[index] = errorMessage;
          }
          return newMessages;
        });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage();
  };

  const handleExamplePromptClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Message content copied to clipboard.",
      duration: 2000,
    })
  }
  
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Corresponds to max-h-52 approx
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      if(scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    // Adjust height on initial render and when attachedImage changes
    if (textareaRef.current) {
        adjustTextareaHeight();
    }
  },[attachedImage, isMobile]);

  const getAvatarFallback = (name: string | null | undefined) => {
    if (!name) return <User />;
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const renderSource = (message: Message) => {
    if (!message.source) return null;

    let icon, text;

    if (message.source === 'web') {
      icon = <Globe className="mr-1 h-3 w-3" />;
      text = 'Source: Web';
    } else if (message.source === 'textbook' && message.sourceBookName) {
      icon = <Book className="mr-1 h-3 w-3" />;
      text = `Source: ${message.sourceBookName}`;
    } else if (message.source === 'textbook') {
        icon = <Book className="mr-1 h-3 w-3" />;
        text = 'Source: Textbook';
    } else {
      icon = <Zap className="mr-1 h-3 w-3" />;
      text = `Source: ${message.source}`;
    }

    return (
      <Badge variant="secondary" className="mt-2">
        {icon}
        {text}
      </Badge>
    );
  };

  return (
    <>
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
      <ScrollArea className="flex-1 pb-40">
        <div className="p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full pt-10">
              <Logo className="h-16 w-auto text-primary mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-8">How can I help you today?</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {examplePrompts.map((item, index) => (
                  <Card key={index} className="glass-card hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleExamplePromptClick(item.prompt)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-base text-primary">
                        {item.icon}
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-sm">{item.prompt}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`group relative flex items-start gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border border-primary/50">
                    <AvatarFallback className="bg-transparent text-primary"><Bot/></AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex items-center gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`max-w-xl rounded-lg p-3 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.image && <img src={message.image} alt="User upload" className="rounded-md mb-2 w-48" />}
                      {message.content ? (
                        <p className="whitespace-pre-wrap" dir="auto">{message.content}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin"/> Thinking...
                        </div>
                      )}
                      {renderSource(message)}
                    </div>
                    {message.content && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopy(message.content)}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    {isLoggedIn && user ? (
                      <>
                        <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                        <AvatarFallback>{getAvatarFallback(user.displayName)}</AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback><User/></AvatarFallback>
                    )}
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div 
        className="fixed bottom-0 left-0 right-0 z-10"
        style={
            (!isMobile && sidebarState === 'expanded') ? (
                dir === 'rtl' 
                ? { marginRight: '16rem' } 
                : { marginLeft: '16rem' }
            ) : {}
        }
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-2 shrink-0 bg-background/80 backdrop-blur-lg">
          {attachedImage && (
            <div className="relative w-24 h-24 mb-2 p-2 border rounded-md bg-muted">
              <img src={attachedImage} alt="Preview" className="w-full h-full object-cover rounded" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                onClick={() => setAttachedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div {...getRootProps()} className="relative">
            <input {...getInputProps()} />
            <form
              onSubmit={handleSubmit}
              className="relative flex w-full items-stretch overflow-hidden rounded-lg border bg-background shadow-lg"
            >
              <div className="flex items-center pl-2 rtl:pl-0 rtl:pr-2">
                 <Button type="button" size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={handleAttachClick}>
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Attach File</span>
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                placeholder={t.chatPlaceholder}
                className="flex-1 resize-none border-0 bg-transparent py-2 px-1 shadow-none focus-visible:ring-0 max-h-52"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
              />
              <div className="flex items-center self-end p-1.5 rtl:pr-0 rtl:pl-1.5">
                <Button
                  type="submit"
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-8 w-8"
                  disabled={isPending || (!input.trim() && !attachedImage)}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          </div>
          <div className="mt-3 flex items-center justify-center space-x-3 rtl:space-x-reverse">
            <Switch
              id="expand-search"
              checked={expandSearch}
              onCheckedChange={setExpandSearch}
            />
            <Label htmlFor="expand-search" className="text-xs font-medium text-muted-foreground">{t.expandSearch}</Label>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
