'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, FileUp, FileCheck2, X } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';


export default function BookUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/my-books');
      return;
    }
    if (acceptedFiles.length > 0) {
      if (acceptedFiles[0].type === 'application/pdf') {
        setFile(acceptedFiles[0]);
        setDialogOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a PDF file.',
        });
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/pdf': ['.pdf'] },
  });

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `textbooks/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message,
        });
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        await addDoc(collection(db, 'books'), {
          userId: user.uid,
          fileName: file.name,
          status: 'pending',
          downloadURL,
          storagePath: storageRef.fullPath,
          createdAt: serverTimestamp(),
        });

        setIsUploading(false);
        setFile(null);
        setDialogOpen(false);
        toast({
          title: 'Success',
          description: t.uploadSuccess,
        });
      }
    );
  };
  
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
        e.preventDefault();
        router.push('/login?redirect=/my-books');
    }
  };
  
  const triggerElement = (
    <Button onClick={isLoggedIn ? undefined : handleTriggerClick} className="glowing-btn">
      <FileUp className="mr-2 h-4 w-4" />
      {t.uploadBook}
    </Button>
  );


  if (!isLoggedIn) {
    return triggerElement;
  }
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          {triggerElement}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className='text-primary'>{t.uploadBook}</DialogTitle>
            <DialogDescription>
              {isDragActive ? 'Drop the file here...' : "Drag 'n' drop a PDF here, or click to select"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!file ? (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <FileUp className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-center text-muted-foreground">
                  {isDragActive ? 'Drop the file here...' : "Drag 'n' drop a PDF here, or click to select"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="h-6 w-6 text-primary" />
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-center text-muted-foreground">{t.uploading} {Math.round(uploadProgress)}%</p>
                  </div>
                )}
                <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full glowing-btn">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.uploadBook}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
    </Dialog>
  );
}
