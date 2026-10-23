import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p>
          애니 캐릭터 이름과 이미지는{" "}
          <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">
            AniList
          </a>
          에서 가져왔고, 저작권은 각 원작자와 권리자에게 있습니다. 티어잇은 AniList의 공식 서비스가 아닙니다.
        </p>
        <p>권리자의 삭제 요청은 각 주제나 캐릭터의 신고 버튼으로 보내 주세요. 확인 후 내립니다.</p>
      </div>
    </footer>
  );
}
