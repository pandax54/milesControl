import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgramLogo, getProgramInitials, resolveProgramLogoSrc } from './program-logo';

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    ...props
  }: React.ComponentProps<'img'> & { fill?: boolean }) => <img alt={alt} src={src} {...props} />,
}));

describe('resolveProgramLogoSrc', () => {
  it('should resolve a bundled icon for known seeded programs', () => {
    expect(resolveProgramLogoSrc('Smiles')).toBe('/icons/programs/smiles.svg');
    expect(resolveProgramLogoSrc('Átomos')).toBe('/icons/programs/atomos.svg');
  });

  it('should prefer a provided local logo path', () => {
    expect(resolveProgramLogoSrc('Smiles', '/logos/custom-smiles.svg')).toBe('/logos/custom-smiles.svg');
  });
});

describe('getProgramInitials', () => {
  it('should derive initials from multi-word program names', () => {
    expect(getProgramInitials('Latam Pass')).toBe('LP');
    expect(getProgramInitials('Azul Fidelidade')).toBe('AF');
  });
});

describe('ProgramLogo', () => {
  it('should render the optimized local logo when a bundled icon exists', () => {
    render(<ProgramLogo name="Smiles" />);

    expect(screen.getByRole('img', { name: 'Smiles logo' })).toHaveAttribute(
      'src',
      '/icons/programs/smiles.svg',
    );
  });

  it('should preserve remote logo URLs with lazy loading', () => {
    render(<ProgramLogo name="Partner Plus" logoUrl="https://cdn.example.com/partner-plus.svg" />);

    const image = screen.getByRole('img', { name: 'Partner Plus logo' });
    expect(image).toHaveAttribute('src', 'https://cdn.example.com/partner-plus.svg');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('should fall back to initials when no image source is available', () => {
    render(<ProgramLogo name="Unknown Program" />);

    expect(screen.getByText('UP')).toBeInTheDocument();
  });
});
