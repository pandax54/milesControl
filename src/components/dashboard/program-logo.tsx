import Image from 'next/image';
import { cn } from '@/lib/utils';

const PROGRAM_LOGO_BY_KEY: Record<string, string> = {
  smiles: '/icons/programs/smiles.svg',
  'latam-pass': '/icons/programs/latam-pass.svg',
  'azul-fidelidade': '/icons/programs/azul-fidelidade.svg',
  livelo: '/icons/programs/livelo.svg',
  esfera: '/icons/programs/esfera.svg',
  iupp: '/icons/programs/iupp.svg',
  atomos: '/icons/programs/atomos.svg',
};

const PROGRAM_LOGO_SIZE = {
  sm: { container: 'h-8 w-8', pixels: 32, text: 'text-xs' },
  default: { container: 'h-10 w-10', pixels: 40, text: 'text-sm' },
  lg: { container: 'h-12 w-12', pixels: 48, text: 'text-base' },
} as const;

interface ProgramLogoProps {
  readonly name: string;
  readonly logoUrl?: string | null;
  readonly size?: keyof typeof PROGRAM_LOGO_SIZE;
  readonly className?: string;
  readonly imageClassName?: string;
}

function normalizeProgramKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveProgramLogoSrc(name: string, logoUrl?: string | null): string | null {
  if (logoUrl?.startsWith('/')) {
    return logoUrl;
  }

  return PROGRAM_LOGO_BY_KEY[normalizeProgramKey(name)] ?? null;
}

export function getProgramInitials(name: string): string {
  const parts = name
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function isRemoteLogoUrl(logoUrl?: string | null): logoUrl is string {
  return Boolean(logoUrl && /^https?:\/\//.test(logoUrl));
}

export function ProgramLogo({
  name,
  logoUrl,
  size = 'default',
  className,
  imageClassName,
}: ProgramLogoProps) {
  const resolvedLogoSrc = resolveProgramLogoSrc(name, logoUrl);
  const sizeConfig = PROGRAM_LOGO_SIZE[size];
  const containerClassName = cn(
    'relative shrink-0 overflow-hidden rounded-lg border bg-muted/40',
    sizeConfig.container,
    className,
  );

  if (resolvedLogoSrc) {
    return (
      <div className={containerClassName}>
        <Image
          src={resolvedLogoSrc}
          alt={`${name} logo`}
          fill
          loading="lazy"
          sizes={`${sizeConfig.pixels}px`}
          className={cn('object-contain p-1.5', imageClassName)}
        />
      </div>
    );
  }

  if (isRemoteLogoUrl(logoUrl)) {
    return (
      <div className={containerClassName}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          className={cn('h-full w-full object-contain p-1.5', imageClassName)}
        />
      </div>
    );
  }

  return (
    <div className={cn(containerClassName, 'flex items-center justify-center')}>
      <span className={cn('font-semibold tracking-wide text-muted-foreground', sizeConfig.text)}>
        {getProgramInitials(name)}
      </span>
    </div>
  );
}
