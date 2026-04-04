// src/types/index.ts

export type PostCategory = "bug" | "feature" | "improvement";
export type PostStatus = "open" | "in_progress" | "closed";

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface PostWithAuthor {
  id: string;
  title: string;
  description: string;
  category: PostCategory;
  status: PostStatus;
  attachmentUrl: string | null;
  storagePath: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<Profile, "id" | "username" | "fullName" | "avatarUrl">;
}

export interface CreatePostInput {
  title: string;
  description: string;
  category: PostCategory;
}

export interface UpdatePostInput {
  title?: string;
  description?: string;
  category?: PostCategory;
  status?: PostStatus;
  attachmentUrl?: string | null;
  storagePath?: string | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
