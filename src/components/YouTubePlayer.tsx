import styles from "./YouTubePlayer.module.css";

/** 유튜브 공식 임베드 플레이어. 쿠키를 덜 남기는 youtube-nocookie 주소를 쓴다 */
export function YouTubePlayer({ id, title, autoplay = false }: { id: string; title: string; autoplay?: boolean }) {
  return (
    <div className={styles.frame}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}`}
        title={`${title} 영상`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
