"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BRANCHES } from "@/constants/branches";
import { Loader2 } from "lucide-react";

export default function BranchSelectionDialog() {
  const { user, branch, loading, refetchProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If we are done loading, have a user, but NO branch, open the dialog
    if (!loading && user && !branch) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [loading, user, branch]);

  const handleSelectBranch = async (selectedBranch: string) => {
    if (!user) return;
    setSaving(true);

    // Log 1: بداية العملية
    console.log("🔵 [BRANCH] بدء تحديث الفرع:", {
      userId: user.id,
      selectedBranch: selectedBranch,
      timestamp: new Date().toISOString(),
    });

    try {
      const { error } = await supabase
        .from("users")
        .update({ branch: selectedBranch })
        .eq("id", user.id);

      if (error) {
        console.error("🔴 [BRANCH] خطأ من Supabase:", {
          message: error.message,
          code: error.code,
        });
        throw error;
      }

      // Log 2: نجاح التحديث
      console.log("🟢 [BRANCH] تم تحديث الفرع بنجاح في قاعدة البيانات:", {
        userId: user.id,
        branch: selectedBranch,
        timestamp: new Date().toISOString(),
      });

      // Log 3: جاري إعادة جلب الملف الشخصي
      console.log(
        "🔄 [BRANCH] جاري إعادة جلب الملف الشخصي من قاعدة البيانات..."
      );

      // استدعاء refetchProfile لتحديث الـ Context فوراً
      await refetchProfile(user.id);

      // Log 4: تم التحديث بنجاح
      console.log("🟢 [BRANCH] تم تحديث الـ Context بنجاح!");

      // Close dialog instead of reloading
      setIsOpen(false);
    } catch (error) {
      console.error("🔴 [BRANCH] فشل تحديث الفرع:", error);
      alert("Failed to save branch selection. Please try again.");
      setSaving(false);
    }
  }; // Prevent closing by clicking outside or escape
  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="text-right">اختر الفرع الدراسي</DialogTitle>
          <DialogDescription className="text-right">
            يرجى اختيار الفرع الدراسي الخاص بك لتخصيص المحتوى والكتب.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {BRANCHES.map((b) => (
            <Button
              key={b.id}
              variant="outline"
              className="w-full justify-start text-right h-12 text-lg"
              onClick={() => handleSelectBranch(b.id)}
              disabled={saving}
            >
              {b.label.ar}
            </Button>
          ))}
        </div>
        {saving && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
