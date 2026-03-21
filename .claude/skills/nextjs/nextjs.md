# Senior Next.js Developer Skills

## Core Next.js Expertise

### Framework Fundamentals

- **App Router (Next.js 13+)**: Server Components, Client Components, Server Actions, Route Handlers
- **Pages Router**: File-based routing, dynamic routes, catch-all routes, optional catch-all
- **Rendering Strategies**: SSR, SSG, ISR, CSR - when to use each approach
- **Data Fetching**: Server-side data fetching, client-side fetching, SWR, React Query integration
- **Metadata API**: SEO optimization, dynamic metadata, Open Graph, Twitter cards

### App Router Architecture (Next.js 13+)

- **React Server Components**: Understanding RSC, async components, data fetching patterns
- **Server Actions**: Form handling, mutations, progressive enhancement
- **Route Organization**: Route groups, parallel routes, intercepting routes, slots
- **Loading & Error States**: loading.tsx, error.tsx, not-found.tsx, global-error.tsx
- **Streaming**: Suspense boundaries, streaming SSR, progressive rendering
- **Layouts**: Nested layouts, template.tsx, root layout configuration

### Routing & Navigation

- **Dynamic Routes**: [slug], [...slug], [[...slug]] patterns
- **Route Handlers**: API routes in app directory, request/response handling
- **Middleware**: Edge middleware, request modification, redirects, rewrites
- **Navigation**: useRouter, usePathname, useSearchParams, Link component optimization
- **Internationalization**: i18n routing, locale detection, translated routes

## Performance Optimization

### Image & Asset Optimization

- **Next/Image**: Automatic optimization, responsive images, lazy loading, blur placeholders
- **Image Formats**: WebP, AVIF conversion, quality settings
- **Font Optimization**: next/font, variable fonts, font subsetting
- **Static Assets**: Public folder, CDN integration, asset prefixing

### Code Optimization

- **Code Splitting**: Automatic code splitting, dynamic imports, route-based splitting
- **Bundle Analysis**: @next/bundle-analyzer, identifying large dependencies
- **Tree Shaking**: Eliminating unused code, import optimization
- **Lazy Loading**: Dynamic imports, React.lazy, component-level code splitting

### Rendering Performance

- **Partial Prerendering**: Combining static and dynamic content
- **Incremental Static Regeneration**: On-demand revalidation, time-based revalidation
- **Edge Runtime**: Edge functions, edge middleware, reduced cold starts
- **Caching**: Data Cache, Full Route Cache, Router Cache, fetch caching strategies

## Data Management

### Data Fetching Patterns

- **Server Components**: Direct database queries, fetch with caching
- **Client Components**: SWR, TanStack Query, useEffect patterns
- **Parallel Data Fetching**: Promise.all, concurrent requests
- **Sequential Data Fetching**: Waterfall prevention, dependent queries
- **Deduplication**: Automatic fetch deduplication in RSC

### State Management

- **React Context**: Server/client context separation, context providers
- **Zustand**: Lightweight state management, store patterns
- **Redux Toolkit**: Integration with Next.js, SSR considerations
- **Jotai/Recoil**: Atomic state management
- **URL State**: Search params, query strings as state

### Database Integration

- **TypeORM**: Entity design, migrations, TypeORM repositories in Server Components
- **Drizzle ORM**: Type-safe queries, Edge-compatible
- **Supabase**: Real-time subscriptions, authentication, storage
- **MongoDB**: Mongoose integration, connection pooling
- **Vercel Postgres**: Edge-compatible database, connection management

## Authentication & Security

### Authentication Patterns

- **NextAuth.js**: OAuth providers, credentials provider, JWT sessions
- **Clerk**: Pre-built UI, user management, organization support
- **Auth0**: Integration patterns, SSO, MFA
- **Custom Auth**: JWT handling, session management, refresh tokens
- **Middleware Auth**: Protected routes, role-based access control

### Security Best Practices

- **CSRF Protection**: Token validation, SameSite cookies
- **Content Security Policy**: CSP headers, nonce generation
- **Environment Variables**: NEXT*PUBLIC* prefix, runtime configuration
- **API Route Security**: Rate limiting, input validation, CORS
- **XSS Prevention**: Sanitization, React's built-in protection

## Styling & UI

### Styling Solutions

- **Tailwind CSS**: Configuration, custom utilities, plugins, responsive design
- **CSS Modules**: Local scoping, composition, naming conventions
- **Styled Components**: SSR support, theming, dynamic styles
- **Emotion**: CSS-in-JS, performance optimization
- **Sass/SCSS**: Module resolution, global styles

### UI Frameworks

- **shadcn/ui**: Component installation, customization, theming
- **Radix UI**: Accessible primitives, composition patterns
- **Headless UI**: Unstyled components, Tailwind integration
- **Material-UI**: SSR configuration, theming, performance
- **Chakra UI**: Design system, responsive styles

## Testing & Quality

### Testing Strategies

- **Unit Testing**: Jest, Vitest with React Testing Library
- **Integration Testing**: Testing Server Components, Server Actions
- **E2E Testing**: Playwright, Cypress for Next.js applications
- **Visual Regression**: Chromatic, Percy for UI testing
- **API Testing**: Testing Route Handlers, middleware

### Quality Tools

- **TypeScript**: Strict mode, type checking, path aliases
- **ESLint**: next/core-web-vitals, custom rules, plugin configuration
- **Prettier**: Code formatting, integration with ESLint
- **Husky**: Pre-commit hooks, lint-staged
- **Type Safety**: Validated environment variables, zod schemas

## Deployment & DevOps

### Vercel Platform

- **Deployment**: Git integration, preview deployments, production deployments
- **Environment Variables**: Environment-specific configuration, secrets management
- **Analytics**: Web Vitals, audience insights, traffic patterns
- **Edge Config**: Dynamic configuration, feature flags
- **Monitoring**: Error tracking, performance monitoring

### Self-Hosting

- **Docker**: Dockerfile optimization, multi-stage builds, standalone output
- **Node.js Server**: Custom server, process management, clustering
- **Static Export**: next export, hosting on CDN
- **Kubernetes**: Container orchestration, scaling strategies
- **CI/CD**: GitHub Actions, GitLab CI, automated deployments

## Advanced Topics

### API Development

- **Route Handlers**: RESTful APIs, request/response handling
- **Validation**: Zod, Yup integration for request validation
- **Error Handling**: Consistent error responses, logging
- **Rate Limiting**: upstash/ratelimit, Redis-based limiting
- **GraphQL**: Apollo Server integration, GraphQL endpoints

### Advanced Patterns

- **Parallel Routes**: Multiple pages in same layout, modal patterns
- **Intercepting Routes**: Soft navigation, modal interceptors
- **Route Groups**: Organization without URL impact, multiple layouts
- **Middleware Chaining**: Complex middleware logic, conditional execution
- **Partial Prerendering**: Static shell with dynamic content

### Monorepo Integration

- **Turborepo**: Shared packages, caching, task orchestration
- **Nx**: Advanced build system, affected commands
- **Shared Components**: Component libraries, design systems
- **Package Management**: Workspace dependencies, version management

## Senior-Level Skills

### Architecture Design

- Designing scalable Next.js application structures
- Choosing appropriate rendering strategies for different use cases
- Planning migration from Pages Router to App Router
- Establishing coding standards and patterns

### Performance Analysis

- Core Web Vitals optimization (LCP, FID, CLS)
- Lighthouse audit interpretation and fixes
- Runtime performance profiling
- Bundle size optimization strategies

### Team Leadership

- Code review focusing on Next.js best practices
- Mentoring on Server Components and new paradigms
- Establishing deployment and monitoring practices
- Conducting Next.js training sessions

### Ecosystem Knowledge

- Understanding Vercel platform capabilities and limitations
- Staying current with Next.js updates and new features
- Evaluating and integrating third-party libraries
- Contributing to Next.js community and ecosystem
