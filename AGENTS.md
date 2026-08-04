# Angular Project Guidelines (v22+)

## Official Standard Reference

Always adhere to the latest official standards at: https://angular.dev/llms.txt

## Core & TypeScript

- Use strict type checking (`strict: true`). Avoid `any`, prefer `unknown`.
- Use the `inject()` function for dependency injection (never use constructor injection).

## Decorators & Services

- Do NOT set `standalone: true` inside decoratators (components, directives, and pipes are standalone by default).
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly (`OnPush` is default).
- Use `@Service()` for singleton services. Use `@Service({ autoProvided: false })` for scoped services.
- Do NOT use `@HostBinding` or `@HostListener`. Define host bindings inside `host: {}` in `@Component` or `@Directive`.

## State & Signals

- Use Signals for state management (`signal`, `computed`, `linkedSignal`).
- Protect service state exposure using `.asReadonly()`.
- Do NOT use `.mutate()` on signals; use `.update()` or `.set()`.
- Use Signal inputs (`input()`, `input.required()`) and Signal outputs (`output()`).
- Use `model()` for two-way bound properties (`[(prop)]`).

## Templates & Forms

- Use native control flow (`@if`, `@for` with `track`, `@switch`, `@defer`).
- Prefer Signal Forms (`@angular/forms/signals`) for forms.
- Do NOT use `ngClass` or `ngStyle`; use `class` and `style` bindings instead.
- Use `NgOptimizedImage` (`ngSrc`) for static images.

## Design & Styling (Tailwind CSS)

- Use Tailwind CSS utility classes directly in templates.
- Design mobile-first using breakpoint prefixes (`sm:`, `md:`, `lg:`).
- Define visual state feedback (`hover:`, `focus-visible:`, `disabled:`).

## Accessibility (a11y)

- Follow WCAG AA standards, including focus management, contrast ratios, and semantic ARIA attributes.
