import { useState } from 'react';
import { Users } from 'lucide-react';
import { getFullImageUrl } from '@/utils/imageUrl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
};

export default function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const full = src ? getFullImageUrl(src) || src : null;
  const sizeClass = typeof size === 'number' ? `h-${size} w-${size}` : (sizeMap[String(size)] || sizeMap.md);

  return (
    <div className={`rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ${sizeClass} ${className}`.trim()}>
      {!failed && full ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={full}
          alt={alt || 'avatar'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          crossOrigin="anonymous"
        />
      ) : (
        <div className={`flex items-center justify-center p-2`}> 
          <Users className="text-primary" />
        </div>
      )}
    </div>
  );
}
