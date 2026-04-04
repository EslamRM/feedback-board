// src/components/posts/PostCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { PostWithAuthor } from "@/types";

const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-red-100 text-red-700",
  feature: "bg-purple-100 text-purple-700",
  improvement: "bg-blue-100 text-blue-700",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-500",
};

type Props = {
  post: PostWithAuthor;
  currentUserId?: string;
  onDelete: (id: string) => void;
};

export function PostCard({ post, currentUserId, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const isOwner = currentUserId === post.authorId;
  const initials = post.author.fullName.slice(0, 2).toUpperCase();
  const isImage = post.attachmentUrl &&
    (post.attachmentUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i));

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      toast({ title: "Failed to delete post", variant: "destructive" });
      return;
    }
    toast({ title: "Post deleted" });
    onDelete(post.id);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-base">{post.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[post.category]}`}>
              {post.category}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[post.status]}`}>
              {post.status.replace("_", " ")}
            </span>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/posts/${post.id}/edit`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this post and its attachment. Cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{post.description}</p>

        {/* Inline image preview — spec requirement */}
        {isImage && post.attachmentUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
            <img
              src={post.attachmentUrl}
              alt="Attachment"
              className="max-h-48 w-auto object-contain bg-gray-50"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Non-image attachment link */}
        {post.attachmentUrl && !isImage && (
          <a
            href={post.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-3"
          >
            📎 View attachment
          </a>
        )}

        {/* Footer: author + date */}
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">@{post.author.username}</span>
            {" · "}
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
