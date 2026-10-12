"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Json } from "@/lib/supabase/database";
import { communityAction } from "../actions";
import type { CommunityInput } from "../schemas";

export function useCommunityMutation() {
  const router = useRouter();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const request = useRef<{ content: string; id: string } | null>(null);
  function requestId(content: unknown) {
    const serialized = JSON.stringify(content) ?? "";
    if (request.current && request.current.content === serialized) return request.current.id;
    const id = crypto.randomUUID();
    request.current = { content: serialized, id };
    return id;
  }
  async function run(input: CommunityInput, success: string, onSuccess?: (data: Json) => void) {
    if (lock.current) return false;
    lock.current = true; setPending(true); setCode(""); setMessage("");
    try {
      const result = await communityAction(input);
      if (!result.ok) { setCode(result.code); setMessage(result.message); return false; }
      request.current = null; onSuccess?.(result.data); setMessage(success); router.refresh(); return true;
    } catch { setCode("INTERNAL_ERROR"); setMessage("결과를 확인하지 못했어요. 같은 내용으로 다시 시도해 주세요."); return false; }
    finally { lock.current = false; setPending(false); }
  }
  return { pending, message, code, run, requestId };
}
