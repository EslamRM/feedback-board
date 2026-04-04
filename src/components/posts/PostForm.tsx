// src/components/posts/PostForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPostSchema, updatePostSchema, type CreatePostSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { PostCategory, PostStatus } from "@/types";

const CATEGORIES: PostCategory[] = ["bug", "feature", "improvement"];
const STATUSES: PostStatus[] = ["open", "in_progress", "closed"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

type CreateMode = {
  mode: "create";
  postId?: never;
  defaultValues?: never;
};

type EditMode = {
  mode: "edit";
  postId: string;
  defaultValues: {
    title: string;
    description: string;
    category: PostCategory;
    status: PostStatus;
    attachmentUrl: string | null;
    storagePath: string | null;
  };
};

type Props = CreateMode | EditMode;

export function PostForm({ mode, postId, defaultValues }: Props) {
  const [loading, setLoading] = useState(false);

  // File state: track what's currently attached
  const [existingUrl, setExistingUrl] = useState<string | null>(
    defaultValues?.attachmentUrl ?? null
  );
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(
    defaultValues?.storagePath ?? null
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const schema = mode === "create" ? createPostSchema : updatePostSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? {
          title: defaultValues.title,
          description: defaultValues.description,
          category: defaultValues.category,
          status: defaultValues.status,
        }
      : { category: "bug" as PostCategory },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 5MB)");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Only JPG, PNG, WEBP, GIF, or PDF allowed");
      return;
    }

    setPendingFile(file);
    // Generate local preview for images
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const removeAttachment = () => {
    setPendingFile(null);
    setPreviewUrl(null);
    setExistingUrl(null);
    setExistingStoragePath(null);
    setFileError(null);
  };

  // Upload file and return { url, storagePath }
  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.data as { url: string; storagePath: string };
  };

  const onSubmit = async (formData: Record<string, unknown>) => {
    setLoading(true);

    try {
      let finalUrl: string | null = existingUrl;
      let finalStoragePath: string | null = existingStoragePath;

      // Upload new file if selected
      if (pendingFile) {
        const uploaded = await uploadFile(pendingFile);
        finalUrl = uploaded.url;
        finalStoragePath = uploaded.storagePath;
      }

      const payload = {
        ...formData,
        attachmentUrl: finalUrl,
        storagePath: finalStoragePath,
      };

      const url = mode === "create" ? "/api/posts" : `/api/posts/${postId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Error", description: json.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({
        title: mode === "create" ? "Post created!" : "Post updated!",
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      toast({ title: "Something went wrong", variant: "destructive" });
      setLoading(false);
    }
  };

  const isImage = (url: string | null) =>
    url?.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="Short, descriptive title..." {...register("title")} />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message as string}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue or idea in detail..."
              rows={5}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message as string}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              {...register("category")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring capitalize"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status — edit only */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Attachment — single file, spec requirement */}
          <div className="space-y-2">
            <Label>Attachment <span className="text-gray-400 font-normal">(optional · image or PDF · max 5MB)</span></Label>

            {/* Show existing or pending attachment */}
            {(existingUrl || previewUrl) ? (
              <div className="relative border rounded-lg overflow-hidden">
                {/* Image preview */}
                {(previewUrl || isImage(existingUrl)) && (
                  <img
                    src={previewUrl ?? existingUrl!}
                    alt="Attachment preview"
                    className="max-h-48 w-auto object-contain bg-gray-50 block"
                  />
                )}
                {/* Non-image indicator */}
                {!previewUrl && existingUrl && !isImage(existingUrl) && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 text-sm text-gray-600">
                    📎 <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View existing attachment</a>
                  </div>
                )}
                {pendingFile && !pendingFile.type.startsWith("image/") && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 text-sm text-gray-700">
                    📎 {pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)}KB)
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="absolute top-2 right-2 bg-white border rounded-full p-1 shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <p className="text-sm text-gray-500">
                  Click to select a file
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF, PDF up to 5MB</p>
              </div>
            )}

            <input
              id="file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {fileError && <p className="text-sm text-red-500">{fileError}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "create" ? "Submit Post" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
