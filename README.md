# data-fair/processing-hello-world

Minimal plugin for data-fair/processings. Create one-line datasets on demand.

## Release

Plugins are fetched from the npm registry with a filter on keyword "data-fair-processings-plugin". So publishing a plugin is as simple as publishing the npm package:

```
npm version minor
npm publish
git push && git push --tags
```

To publish a test version, use prerelease versioning with a "test" npm tag:

```
npm version preminor --preid=beta --tag=test
npm publish
git push && git push --tags
```