import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled, isSupabaseEnabled } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";
import { SocialLogin } from "./SocialLogin";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className={styles.main}>
      <div className={`panel ${styles.box}`}>
        <h1 className="display">로그인</h1>
        <p className="muted">
          종합 티어는 한 사람당 한 표씩만 반영돼요. 로그인하면 내가 매긴 티어가 반영되고, 나중에 고칠 수도 있어요.
        </p>

        {sp.error && <p className="error">로그인하지 못했어요. 다시 시도해 주세요.</p>}

        {isSupabaseEnabled ? (
          <SocialLogin next={next} />
        ) : isDevAuthEnabled ? (
          <form action="/api/dev/login" method="post" className={styles.dev}>
            <input type="hidden" name="next" value={next} />
            <button className="btn" type="submit">
              개발용 계정으로 시작하기
            </button>
            <p className="muted">
              Supabase가 설정되지 않아 로컬 개발 모드로 동작 중이에요. <code>.env.local</code>에 Supabase 키를 넣으면
              카카오·구글 로그인으로 바뀝니다.
            </p>
          </form>
        ) : (
          <p className="error">로그인이 아직 설정되지 않았어요.</p>
        )}
      </div>
    </main>
  );
}
