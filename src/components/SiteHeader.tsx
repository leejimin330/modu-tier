import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={`display ${styles.logo}`}>
          <span className={styles.mark} aria-hidden="true">
            S
          </span>
          티어잇
        </Link>
        <nav className={styles.nav}>
          {isAdmin(user) && <Link href="/admin">관리</Link>}
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="link-button" type="submit">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-small btn-plain">
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
