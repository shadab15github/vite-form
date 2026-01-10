import VanilaForm from "./vanila-form/VanilaForm";

function App() {
  return <VanilaForm />;
}

export default App;


import React, { useEffect, useState } from "react";
import "./Posts.css";

type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("https://jsonplaceholder.typicode.com/posts");

        if (!res.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data: Post[] = await res.json();
        setPosts(data.slice(0, 10)); // limit to 10 posts
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <p className="status">Loading...</p>;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div className="posts-container">
      <h2 className="title">Posts</h2>

      <div className="posts-grid">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <span>User ID: {post.userId}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Posts;

.posts-container {
  padding: 20px;
  max-width: 900px;
  margin: auto;
}

.title {
  text-align: center;
  margin-bottom: 20px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.post-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.post-card:hover {
  transform: translateY(-4px);
}

.post-card h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.post-card p {
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
}

.post-card span {
  font-size: 12px;
  color: #888;
}

.status {
  text-align: center;
  margin-top: 40px;
  font-size: 16px;
}

.error {
  color: red;
}