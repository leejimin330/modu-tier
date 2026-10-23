import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/config";
import { UPLOAD_DIR } from "@/lib/store/file-store";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// 로컬 개발 모드에서 직접 올린 이미지를 내려준다. 운영에서는 Supabase Storage URL을 쓴다.
export async function GET(_req: Request, { params }: RouteContext<"/uploads/[name]">) {
  const { name } = await params;
  const m = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.exec(name);
  if (isSupabaseEnabled || !m) return new NextResponse(null, { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(data, {
      headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
