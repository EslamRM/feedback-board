// src/app/(dashboard)/page.tsx
import { PostList } from "@/components/posts/PostList";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Board</h1>
          <p className="text-gray-500 mt-1">
            Share ideas, report bugs, and suggest improvements
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link href="/create">+ New Post</Link>
          </Button>
        )}
      </div>

      <PostList currentUserId={user?.id} />
    </div>
  );
}
