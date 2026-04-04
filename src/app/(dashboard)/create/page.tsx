// src/app/(dashboard)/create/page.tsx
import { PostForm } from "@/components/posts/PostForm";

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Post</h1>
        <p className="text-gray-500 mt-1">Share an idea, report a bug, or suggest an improvement</p>
      </div>
      <PostForm mode="create" />
    </div>
  );
}
