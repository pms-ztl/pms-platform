import { getAvatarUrl } from '@/lib/api';

interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  /** Size preset: 'xs' (24px), 'sm' (32px), 'md' (40px), 'lg' (80px), 'xl' (120px) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { px: 'h-6 w-6', text: 'text-2xs', variant: 'sm' as const },
  sm: { px: 'h-8 w-8', text: 'text-sm', variant: 'sm' as const },
  md: { px: 'h-10 w-10', text: 'text-sm', variant: 'sm' as const },
  lg: { px: 'h-20 w-20', text: 'text-2xl', variant: 'md' as const },
  xl: { px: 'h-28 w-28', text: 'text-3xl', variant: 'lg' as const },
};

/**
 * Reusable avatar component that:
 * - Uses optimized thumbnails for local uploads
 * - Falls back to initials if no avatar
 * - Passes through external URLs (dicebear, etc.)
 */
export function UserAvatar({ avatarUrl, firstName, lastName, size = 'md', className = '' }: UserAvatarProps) {
  const config = sizeMap[size];
  const url = getAvatarUrl(avatarUrl, config.variant);

  if (url) {
    return (
      <img
        src={url}
        alt={`${firstName || ''} ${lastName || ''}`.trim() || 'User'}
        className={`${config.px} rounded-full object-cover bg-secondary-50 dark:bg-secondary-800 ${className}`}
      />
    );
  }

  return (
    <div className={`${config.px} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center ${className}`}>
      <span className={`${config.text} font-medium text-primary-700 dark:text-primary-300`}>
        {firstName?.[0] || ''}{lastName?.[0] || ''}
      </span>
    </div>
  );
}
