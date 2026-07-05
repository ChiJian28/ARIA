import Image from 'next/image';
import { cn } from '@/lib/cn';

interface AriaLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function AriaLogo({ size = 32, className, priority = false }: AriaLogoProps) {
  return (
    <Image
      src="/favicon.ico"
      alt="ARIA"
      width={size}
      height={size}
      priority={priority}
      className={cn('rounded-lg object-contain shrink-0', className)}
    />
  );
}
