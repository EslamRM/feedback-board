// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use JPG, PNG, WEBP, GIF, or PDF." },
        { status: 400 }
      );
    }

    // Store under user's own folder — required for storage RLS policy
    const ext = file.name.split(".").pop() ?? "bin";
    const fileName = `${Date.now()}.${ext}`;
    const storagePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const service = createServiceClient();

    const { error: uploadError } = await service.storage
      .from("feedback-attachments")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL for display
    const {
      data: { publicUrl },
    } = service.storage.from("feedback-attachments").getPublicUrl(storagePath);

    return NextResponse.json({
      data: {
        url: publicUrl,
        storagePath,
        mimeType: file.type,
        fileName: file.name,
      },
    });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
