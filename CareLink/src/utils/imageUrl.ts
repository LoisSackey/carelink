/**
 * Convert relative image URLs to full URLs
 * Handles both relative paths (/uploads/...) and already-full URLs
 */
export const getFullImageUrl = (imageUrl: string | undefined | null): string | null => {
  if (!imageUrl) return null;

  // If it's already a full URL (starts with http), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it's a relative path, convert it to a full URL
  if (imageUrl.startsWith('/uploads')) {
    // Check if VITE_API_URL is configured (production)
    if (import.meta.env.VITE_API_URL) {
      const API_BASE_URL = import.meta.env.VITE_API_URL;
      const serverBaseUrl = API_BASE_URL.replace('/api', '');
      return `${serverBaseUrl}${imageUrl}`;
    }
    
    // In development, use relative URL if the proxy can handle it
    // Otherwise fall back to localhost:5000
    try {
      // For development, we need to fetch from the actual backend
      return `http://localhost:5000${imageUrl}`;
    } catch {
      // Fallback
      return imageUrl;
    }
  }

  // Handle common shorthand values that may be returned from the backend
  // Examples: 'profiles/filename.jpg' or just 'filename.jpg'
  // Normalize these to the local uploads path so images resolve correctly
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    const serverBaseUrl = API_BASE_URL ? API_BASE_URL.replace('/api', '') : 'http://localhost:5000';

    // If path starts with 'profiles/' or 'credentials/' etc, prefix with '/uploads/'
    if (imageUrl.startsWith('profiles/') || imageUrl.startsWith('credentials/') || imageUrl.startsWith('receipts/')) {
      return `${serverBaseUrl}/uploads/${imageUrl}`;
    }

    // If it's a bare filename (has an image extension), assume profiles folder
    if (/^[^/]+\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(imageUrl)) {
      return `${serverBaseUrl}/uploads/profiles/${imageUrl}`;
    }
  } catch (e) {
    // ignore and fall through to return original
  }

  // Handle S3 style paths returned as s3://bucket/key
  if (imageUrl.startsWith('s3://')) {
    try {
      const parts = imageUrl.replace('s3://', '').split('/');
      const bucket = parts.shift();
      const key = parts.join('/');
      if (bucket && key) {
        // Public S3 URL pattern
        return `https://${bucket}.s3.amazonaws.com/${key}`;
      }
    } catch (e) {
      // fallback to original
    }
  }

  // Return as-is if it doesn't match known patterns
  return imageUrl;
};
