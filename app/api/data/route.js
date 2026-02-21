import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const KEY = "chorequest-data";

export async function GET() {
  try {
    const data = await kv.get(KEY);
    return NextResponse.json({ data: data || null });
  } catch (e) {
    console.error("KV GET error:", e);
    return NextResponse.json({ data: null });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await kv.set(KEY, body.data);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("KV POST error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
