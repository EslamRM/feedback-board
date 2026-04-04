// src/app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updatePostSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/posts/:id — public
export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[GET /api/posts/:id]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/posts/:id — owner only
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Application-layer ownership check (RLS is the primary guard)
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // If a new file is being set, delete the old one from Storage
    const incomingPath = parsed.data.storagePath;
    if (incomingPath !== undefined && existing.storagePath && existing.storagePath !== incomingPath) {
      const service = createServiceClient();
      await service.storage.from("feedback-attachments").remove([existing.storagePath]);
    }

    const post = await prisma.post.update({
      where: { id },
      data: parsed.data,
      include: {
        author: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[PUT /api/posts/:id]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/posts/:id — owner only, removes Storage file first
export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from Supabase Storage BEFORE the DB row (no orphaned files)
    if (existing.storagePath) {
      const service = createServiceClient();
      const { error: storageError } = await service.storage
        .from("feedback-attachments")
        .remove([existing.storagePath]);

      if (storageError) {
        // Log but don't block — DB record still needs to be cleaned up
        console.error("[DELETE] Storage remove error:", storageError.message);
      }
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/posts/:id]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
