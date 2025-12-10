"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/lib/supabase-auth";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/logo";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await resetPassword(values.email);
      setSubmitted(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Logo className="h-10 w-auto text-primary" />
      </div>
      <Card className="w-full max-w-md glass-card">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            {submitted
              ? "If an account exists for this email, you will receive a password reset link."
              : "Enter your email to receive a password reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center">
              <p>Check your inbox (and spam folder) for the reset link.</p>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full glowing-btn"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Login
        </Link>
      </p>
    </main>
  );
}
