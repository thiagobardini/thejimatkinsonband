import { getBandPosts } from "@/lib/facebook-posts-server";
import { NewsFeed } from "./news-feed";
import styles from "./band-news.module.css";

export async function BandNews() {
  const initial = await getBandPosts();
  if (initial.status === "connected" && !initial.posts.length && !initial.nextCursor) return null;
  return <NewsFeed initial={initial} />;
}

export function NewsLoading() {
  return (
    <section id="news" className={`${styles.section} mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16`} aria-label="Loading latest news" aria-busy="true">
      <div className={styles.heading}>
        <p className="eyebrow section-label"><span className="accent-dot" aria-hidden="true" /> FROM THE BAND</p>
        <h2 className="section-title font-display uppercase">Latest news.</h2>
      </div>
      <div className={styles.skeleton} aria-hidden="true"><span /><span /></div>
      <span className="sr-only" role="status">Loading the latest from the band.</span>
    </section>
  );
}
