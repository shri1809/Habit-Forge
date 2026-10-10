import { useEffect } from "react";

/**
 * Custom hook to update on-page SEO metadata (title and description) dynamically per route.
 *
 * @param {Object} params
 * @param {string} params.title - Page-specific title
 * @param {string} [params.description] - Page-specific meta description
 */
export function useSEO({ title, description }) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = `${title} — HabitForge`;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    const prevDescription = metaDescription ? metaDescription.getAttribute("content") : "";

    if (description && metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = prevTitle;
      if (prevDescription && metaDescription) {
        metaDescription.setAttribute("content", prevDescription);
      }
    };
  }, [title, description]);
}

export default useSEO;

