import FileBrowser from "../FileBrowser";

const posts = [
  {
    date: "2026-05-20",
    title: "Building an OS-like Portfolio",
    excerpt: "How I created a desktop experience in the browser with React",
  },
  {
    date: "2026-04-10",
    title: "Rust for Web Developers",
    excerpt: "A practical introduction to Rust from a TypeScript perspective",
  },
  {
    date: "2026-03-01",
    title: "The Art of CLI Design",
    excerpt: "Lessons learned from building command-line interfaces",
  },
  {
    date: "2026-01-15",
    title: "Why I Love TypeScript",
    excerpt: "Type safety, developer experience, and productivity",
  },
];

function Blog() {
  return (
    <FileBrowser
      title="Blog"
      items={posts.map((post) => ({
        name: `${post.date} - ${post.title}`,
        type: "file" as const,
        detail: (
          <>
            <time className="blog-date">{post.date}</time>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </>
        ),
      }))}
    />
  );
}

export default Blog;