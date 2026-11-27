# HanaMesh Desktop language pack

`@hanamesh/brand-locales` adds Korean, Vietnamese and Indonesian to the existing DSH language selector. It contributes dictionaries through the public DSH locale service. Missing translations follow DSH's English fallback, and DSH stores the language preference. The pack contributes only locale definitions and dictionaries.

The three dictionaries are adapted from [dsh-locale-pack v0.9.2](https://github.com/sayho-pm/dsh-locale-pack/tree/37d953df8d0237fa2e0fa3be6b568681f5b5967f) under MIT. Entries were matched against the English source and interpolation placeholders in Harness 0.2.2-rc.5. The language selector labels are maintained with the HanaMesh integration. See the included `UPSTREAM-MIT.txt` for the original notice.

Build from the Brand repository with `npm ci` and `npm run build`. The independent archive is produced from the repository root with `npm pack ./packages/hanamesh-brand-locales`. The DSH bundle patch inserts this language package by its own name. The Brand visual plugin continues to use its original package entry.
