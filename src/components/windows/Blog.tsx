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
    <div className="window-content-inner">
      <h1>Blog</h1>
      <p className="window-subtitle">Latest writings</p>
      <div className="blog-list">
        {posts.map((post) => (
          <article key={post.title} className="blog-post">
            <time className="blog-date">{post.date}</time>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Blog;
