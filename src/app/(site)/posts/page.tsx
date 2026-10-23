import { Suspense } from "react";

import BlogIndex from "@/components/BlogIndex";
import { allPosts } from "@/data/posts";

export const metadata = { title: "כל הפוסטים" };

/* Figma 536:591. The list is read on the server and handed to a client
   component, which is the shape this keeps when Sanity replaces the files. */
export default function Page() {
  /* Suspense: BlogIndex reads ?stage= through useSearchParams. */
  return (
    <Suspense fallback={null}>
      <BlogIndex posts={allPosts()} />
    </Suspense>
  );
}
