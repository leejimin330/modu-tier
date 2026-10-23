import "server-only";
import { cookies } from "next/headers";
import { isDevAuthEnabled, isSupabaseEnabled } from "./config";
import { store } from "./store";
import { createSupabaseServerClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  provider: string;
  label: string;
}

export const DEV_COOKIE = "dev_uid";

/** 현재 로그인한 사용자. 로그인하지 않았으면 null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // 쿠키를 항상 읽어 이 함수를 쓰는 페이지가 요청마다 렌더링되게 한다.
  const cookieStore = await cookies();

  if (isSupabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const provider = (u.app_metadata?.provider as string | undefined) ?? "unknown";
    const label =
      (u.user_metadata?.name as string | undefined) ??
      (u.user_metadata?.full_name as string | undefined) ??
      u.email ??
      "회원";
    return { id: u.id, provider, label };
  }

  if (isDevAuthEnabled) {
    const id = cookieStore.get(DEV_COOKIE)?.value;
    if (id && /^[0-9a-f-]{36}$/.test(id)) return { id, provider: "dev", label: "개발용 계정" };
  }
  return null;
}

/** 관리자: ADMIN_USER_IDS(쉼표 구분)에 든 사용자. 로컬 개발 모드에서는 개발용 계정도 관리자. */
export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.provider === "dev" && process.env.NODE_ENV !== "production") return true;
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  return ids.includes(user.id);
}

/** 로그인 필수 작업용. 사용자 레코드도 함께 보장한다. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다");
  await store.ensureUser(user.id, user.provider, user.label);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("관리자 권한이 필요합니다");
  return user!;
}
