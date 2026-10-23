import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import styles from "./admin.module.css";

export const metadata = { title: "관리", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // 관리자가 아니면 관리 화면이 있다는 것도 드러내지 않는다
  if (!isAdmin(await getCurrentUser())) notFound();

  return (
    <main className="container">
      <nav className={styles.nav}>
        <Link href="/admin">주제 관리</Link>
        <Link href="/admin/reports">신고 처리</Link>
      </nav>
      {children}
    </main>
  );
}
