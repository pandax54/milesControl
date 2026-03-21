# Senior React.js Developer Skills

## Core React Expertise

### React Fundamentals
- **Component Architecture**: Functional components, component composition, component hierarchy
- **JSX**: JSX syntax, JSX expressions, fragments, conditional rendering
- **Props**: Props passing, prop types, default props, children prop, prop drilling
- **State Management**: useState, state immutability, state updates, derived state
- **Effects**: useEffect, dependency arrays, cleanup functions, effect timing
- **Refs**: useRef, ref forwarding, DOM refs, value refs, imperative handles

### Hooks System
- **Core Hooks**: useState, useEffect, useContext, useRef, useCallback, useMemo, useReducer
- **Custom Hooks**: Hook composition, reusable logic, naming conventions
- **Hook Rules**: Rules of hooks, dependency array management, stale closures
- **Advanced Hooks**: useImperativeHandle, useLayoutEffect, useDebugValue, useId
- **Hook Patterns**: Compound components, state reducer, controlled components

### Modern React Features
- **Concurrent Features**: useTransition, useDeferredValue, startTransition
- **Suspense**: Data fetching, lazy loading, error boundaries, suspense boundaries
- **Server Components**: RSC architecture, server/client separation, use server/client
- **Server Actions**: Form actions, progressive enhancement, revalidation
- **React 19 Features**: use hook, form actions, optimistic updates

## Component Patterns

### Design Patterns
- **Compound Components**: Context-based composition, flexible APIs
- **Render Props**: Function as children, render prop pattern, inversion of control
- **Higher-Order Components**: HOC composition, prop injection, cross-cutting concerns
- **Container/Presentational**: Separation of concerns, smart/dumb components
- **Controlled/Uncontrolled**: Form handling, input control, default values

### Advanced Patterns
- **State Reducer**: useReducer with actions, state machines, complex state
- **Context Module**: Context + hooks pattern, avoiding prop drilling
- **Composition**: Component composition over inheritance, slot patterns
- **Polymorphic Components**: as prop pattern, component polymorphism
- **Headless Components**: Logic separation, unstyled components

## State Management

### React Context
- **Context API**: createContext, Provider, useContext
- **Context Patterns**: Multiple contexts, context composition, context modules
- **Performance**: Context splitting, memo optimization, context selectors
- **Limitations**: Understanding context limitations, when to use alternatives

### External State Libraries
- **Redux Toolkit**: Slices, RTK Query, createAsyncThunk, normalized state
- **Zustand**: Store creation, middleware, devtools, persistence
- **Jotai**: Atoms, derived atoms, async atoms, atom families
- **Recoil**: Atoms, selectors, atom families, async selectors
- **MobX**: Observables, actions, computed values, reactions
- **TanStack Query**: Data fetching, caching, mutations, optimistic updates

### State Patterns
- **Local vs Global**: State placement strategy, state lifting
- **Derived State**: Computing from props/state, useMemo for expensive calculations
- **URL State**: Search params, route params, query strings as state
- **Form State**: Controlled forms, form libraries (Formik, React Hook Form)

## Performance Optimization

### Rendering Optimization
- **React.memo**: Component memoization, custom comparison, when to use
- **useMemo**: Expensive calculations, referential equality, dependency arrays
- **useCallback**: Function memoization, event handlers, child component optimization
- **Code Splitting**: React.lazy, dynamic imports, route-based splitting
- **Virtualization**: react-window, react-virtualized, infinite scrolling

### Performance Patterns
- **Avoiding Re-renders**: Proper dependency arrays, state structure, component splitting
- **Bailout Strategies**: Bailout conditions, same element reference
- **Profiling**: React DevTools Profiler, flame graphs, commit phases
- **Bundle Optimization**: Tree shaking, dead code elimination, chunk splitting
- **Web Workers**: Offloading computation, comlink integration

### Concurrent React
- **Transitions**: useTransition for non-urgent updates, isPending state
- **Deferred Values**: useDeferredValue, debouncing alternatives
- **Suspense Patterns**: Suspense boundaries, loading states, error boundaries
- **Priority**: Understanding update priorities, urgent vs transitions

## Routing

### React Router
- **Route Configuration**: Route components, nested routes, layout routes
- **Navigation**: Link, NavLink, useNavigate, Navigate component
- **Route Parameters**: Dynamic segments, useParams, route matching
- **Search Params**: useSearchParams, query string management
- **Loaders & Actions**: Data loading, form actions, deferred data
- **Error Handling**: ErrorBoundary, error elements, 404 handling

### Advanced Routing
- **Protected Routes**: Auth guards, route protection patterns
- **Route Transitions**: Page transitions, animation coordination
- **Route Prefetching**: Link prefetching, hover prefetch
- **Scroll Restoration**: Scroll position management, scroll to top
- **Code Splitting**: Route-based code splitting, lazy route loading

## Forms & Validation

### Form Libraries
- **React Hook Form**: useForm, register, validation, form state
- **Formik**: Field components, validation schemas, form lifecycle
- **Uncontrolled Forms**: FormData API, native form handling, server actions
- **Form Validation**: Yup, Zod, custom validators, async validation

### Form Patterns
- **Field Arrays**: Dynamic fields, nested forms, field manipulation
- **Wizard Forms**: Multi-step forms, step validation, progress tracking
- **Form State**: Touched, dirty, errors, submission state
- **Optimistic Updates**: Instant feedback, rollback on error

## Styling Solutions

### CSS-in-JS
- **Styled Components**: Tagged templates, theming, dynamic styles, SSR
- **Emotion**: css prop, styled API, theming, performance
- **Vanilla Extract**: Zero-runtime, TypeScript styles, type-safe themes
- **Linaria**: Zero-runtime CSS-in-JS, build-time extraction

### Utility-First CSS
- **Tailwind CSS**: Utility classes, custom configuration, plugins, JIT
- **UnoCSS**: Instant atomic CSS, presets, custom rules

### Component Libraries
- **Material-UI (MUI)**: Components, theming, sx prop, customization
- **Chakra UI**: Design system, composable components, theming
- **Radix UI**: Unstyled primitives, accessibility, composition
- **shadcn/ui**: Copy-paste components, Radix + Tailwind
- **Ant Design**: Enterprise components, internationalization

## TypeScript Integration

### React TypeScript
- **Component Types**: FC, ReactNode, ReactElement, ComponentProps
- **Props Types**: Interface vs type, optional props, children types
- **Event Types**: Event handlers, synthetic events, native events
- **Ref Types**: RefObject, MutableRefObject, ForwardedRef
- **Hook Types**: Custom hook types, generic hooks, hook return types

### Advanced TypeScript
- **Generic Components**: Type parameters, constraints, inference
- **Utility Types**: Omit, Pick, Partial for props, ReturnType
- **Type Guards**: Narrowing props, discriminated unions
- **Module Augmentation**: Extending library types, declaration merging
- **Type-safe APIs**: Typed fetch, API client types, response types

## Testing

### Testing Libraries
- **React Testing Library**: Render, queries, user events, async utilities
- **Jest**: Test suites, mocking, snapshots, coverage
- **Vitest**: Fast unit testing, Vite integration, compatible API
- **Playwright/Cypress**: E2E testing, component testing, visual testing

### Testing Patterns
- **Component Testing**: Rendering, user interactions, assertions
- **Hook Testing**: @testing-library/react-hooks, custom hook testing
- **Integration Testing**: Multi-component testing, API mocking
- **Accessibility Testing**: jest-axe, accessibility assertions
- **Visual Testing**: Snapshot testing, visual regression, Chromatic

### Testing Best Practices
- **Query Priority**: getByRole, getByLabelText, getByText, getByTestId
- **User-Centric Tests**: Testing user behavior, avoiding implementation details
- **Async Testing**: waitFor, findBy queries, act warnings
- **Mocking**: Module mocks, API mocking with MSW, mock service worker

## Build Tools & Ecosystem

### Build Tools
- **Vite**: Fast development, HMR, build optimization, plugins
- **Webpack**: Configuration, loaders, plugins, code splitting
- **esbuild**: Fast bundling, minimal configuration
- **Turbopack**: Next-gen bundler, incremental builds
- **Parcel**: Zero-config bundling, automatic optimization

### Development Tools
- **ESLint**: React plugin, hooks plugin, jsx-a11y plugin
- **Prettier**: Code formatting, integration with ESLint
- **React DevTools**: Component inspector, profiler, hooks debugging
- **TypeScript**: Type checking, tsconfig configuration, path mapping

## Advanced Topics

### React Compiler (Experimental)
- **Auto-memoization**: Compiler-based optimization, forget memo
- **Compiler Directives**: use memo, use callback alternatives
- **Migration**: Preparing codebases for compiler adoption

### Micro-Frontends
- **Module Federation**: Webpack 5 module federation, remote modules
- **Single-SPA**: Framework-agnostic micro-frontends, routing
- **Independent Deployment**: Versioning, backward compatibility

### Animation
- **Framer Motion**: Declarative animations, gestures, layout animations
- **React Spring**: Physics-based animations, hooks API
- **CSS Transitions**: Transition group, CSSTransition, animation timing

### Accessibility
- **ARIA**: Roles, states, properties, live regions
- **Keyboard Navigation**: Focus management, keyboard shortcuts, tab order
- **Screen Readers**: Semantic HTML, alt text, aria-labels
- **Color Contrast**: WCAG compliance, contrast ratios

## Senior-Level Skills

### Architecture Design
- Designing scalable React application architectures
- Choosing appropriate state management solutions
- Planning component library design and API design
- Establishing coding standards and best practices

### Performance Engineering
- Profiling and optimizing React applications
- Bundle size optimization strategies
- Runtime performance optimization
- Memory leak detection and prevention

### Team Leadership
- Code review focusing on React patterns and performance
- Mentoring junior developers on React concepts
- Conducting React training sessions
- Establishing testing strategies and CI/CD

### Ecosystem Knowledge
- Staying current with React updates and proposals
- Understanding React internals and fiber architecture
- Evaluating and integrating libraries
- Contributing to React ecosystem and open source
