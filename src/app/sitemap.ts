import type { MetadataRoute } from "next";

const baseUrl = "https://codehaveneduai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/exam`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/smart-exam`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/dashboard`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/dashboard/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/dashboard/password`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/admin`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/admin/quizzes`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/admin/quizzes/create`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/admin/questions`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/admin/results`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/admin/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/admin/users`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
