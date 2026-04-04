// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations";
import { PostCategory } from "@prisma/client";

// GET /api/posts — public, category filter + sort
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get("category");
    const sort = searchParams.get("sort") ?? "newest";

    // Validate category against Prisma enum values
    const validCategories = Object.values(PostCategory);
    const category =
      rawCategory && validCategories.includes(rawCategory as PostCategory)
        ? (rawCategory as PostCategory)
        : undefined;

    const posts = await prisma.post.findMany({
      where: { ...(category ? { category } : {}) },
      include: {
        author: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
    });

    return NextResponse.json({ data: posts });
  } catch (error) {
    console.error("[GET /api/posts]", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/posts — authenticated users only
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category as PostCategory,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/posts]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
