// src/components/posts/PostList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithAuthor, PostCategory } from "@/types";

const CATEGORIES: { label: string; value: PostCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Bug", value: "bug" },
  { label: "Feature", value: "feature" },
  { label: "Improvement", value: "improvement" },
];

type Props = { currentUserId?: string };

export function PostList({ currentUserId }: Props) {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (category !== "all") params.set("category", category);

    const res = await fetch(`/api/posts?${params}`);
    const json = await res.json();
    setPosts(json.data ?? []);
    setLoading(false);
  }, [category, sort]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant={sort === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("newest")}
          >
            Newest
          </Button>
          <Button
            variant={sort === "oldest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("oldest")}
          >
            Oldest
          </Button>
        </div>
      </div>

      {!loading && (
        <p className="text-sm text-gray-500 mb-4">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      )}

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-5">
                <Skeleton className="h-5 w-2/3 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))
          : posts.length === 0
          ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <p className="text-gray-400 text-lg">No posts yet</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to post!</p>
            </div>
          )
          : posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onDelete={handleDelete}
              />
            ))}
      </div>
    </div>
  );
}
