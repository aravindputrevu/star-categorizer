# CLAUDE.md - Star Categorizer Project Reference

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code
- `npm run test` - Run tests (when added)

## Code Style Guidelines
- **TypeScript**: Use strict typing with explicit return types and interfaces
- **Component Structure**: React components use functional style with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Group and order - React, external libs, internal components, styles
- **Error Handling**: Use try/catch blocks with proper error logging
- **Formatting**: 2 space indentation, semicolons, single quotes
- **CSS**: Use Tailwind with shadcn/ui components and cn() utility
- **API Routes**: Use Next.js API routes with proper error responses
- **Environment Variables**: For sensitive data (keys, tokens)