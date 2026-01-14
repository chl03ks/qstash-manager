# Pre-Publish Checklist

✅ TypeScript compiles without errors (`npm run typecheck`)
✅ All tests pass (`npm test`)
✅ Build succeeds (`npm run build`)
✅ LICENSE file exists (MIT)
✅ CHANGELOG.md created with v0.1.0 entry
✅ CONTRIBUTING.md created
✅ Development files removed (DESIGN.md, etc.)
✅ Package tarball tested (`npm pack`)
✅ Local installation tested
✅ No dev files in package
✅ All npm scripts work
✅ README badges point to correct URLs
✅ Git history cleaned (optional, see Task 8)

## Ready to Publish

Once all items above are checked:

1. Tag release: `git tag v0.1.0`
2. Push tags: `git push origin main --tags`
3. Publish: `npm publish`
4. Verify: `npm info qstash-manager`
5. Test install: `npx qstash-manager@0.1.0`
