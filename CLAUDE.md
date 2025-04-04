# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands
- Build: `npm run build`
- Development mode: `npm run dev`
- Run all tests: `npm run test`
- Run single test: `npm run test -- src/channel.test.ts`
- Run test with pattern: `npm run test -- -t "should handle buffered channels"`
- Check formatting: `npx @biomejs/biome check .`
- Format code: `npx @biomejs/biome format --write .`

## Code Style Guidelines
- TypeScript with React and Ink (terminal UI framework)
- Use tabs for indentation (configured in biome.json)
- Use double quotes for strings (configured in biome.json)
- Imports: Use named imports where possible, append `.js` extension to local imports
- Components: Use functional components with hooks
- Keybindings: Use the `useKeybindings` hook for keyboard shortcuts
- Types: Define interfaces/types at the top of files
- Error handling: Return tuples with [result, error] pattern
- File structure: Components in components/, hooks in hooks/
- Testing: Use Vitest with describe/it blocks