import Community from "@/components/Community";
import Hero from "@/components/Hero";
import LifeStagesScroll from "@/components/LifeStagesScroll";
import StartHere from "@/components/StartHere";
import ToolboxHome from "@/components/ToolboxHome";
import WhatsAppQuestions from "@/components/WhatsAppQuestions";
import { allPosts } from "@/data/posts";

/*
 * The homepage - Figma 4:2, in the frame's own order.
 *
 * ORDER. Taken from the y offsets of 4:2's children, not from the order the
 * sections happened to be built in: Hero 0, שלבי חיים 845, שאלות מהוואטסאפ
 * 1751, ארגז כלים 3196, אתם יכולים להתחיל כאן 4431, הקהילה 5442, footer 6145.
 * The build order ran start-here and toolbox first, which would have put them
 * in the wrong places; the frame decides, not the build sequence.
 *
 * Navbar and footer live in the layout, because every page has them.
 */
export default function Page() {
  const posts = allPosts();

  return (
    <main>
      <Hero />
      <LifeStagesScroll />
      <WhatsAppQuestions />
      <ToolboxHome postCount={posts.length} />
      <StartHere posts={posts} />
      <Community />
    </main>
  );
}
