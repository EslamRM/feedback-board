// src/app/(dashboard)/posts/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { PostForm } from "@/components/posts/PostForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { PostCategory, PostStatus } from "@/types";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) notFound();
  if (post.authorId !== user?.id) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
      </div>
      <PostForm
        mode="edit"
        postId={id}
        defaultValues={{
          title: post.title,
          description: post.description,
          // Prisma enums are stored as their string value — cast to our union type
          category: post.category as PostCategory,
          status: post.status as PostStatus,
          attachmentUrl: post.attachmentUrl,
          storagePath: post.storagePath,
        }}
      />
    </div>
  );
}
