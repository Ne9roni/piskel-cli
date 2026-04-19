# Bundled Piskel web editor

This directory contains a **production build** of [piskelapp/piskel](https://github.com/piskelapp/piskel) (`dest/prod`), licensed under **Apache-2.0** (same as upstream).

It is shipped inside `piskel-cli` so `piskel-cli serve` can open the **same in-browser editor** as [piskelapp.com](https://www.piskelapp.com/) without requiring users to clone or build Piskel separately.

Maintainers can refresh it with:

```bash
# from a clone of piskelapp/piskel, after npm install && npm run build:
rm -rf /path/to/piskel-cli/vendor/piskel-prod
cp -a dest/prod /path/to/piskel-cli/vendor/piskel-prod
```

Or from this repo: `npm run sync-piskel-vendor` (defaults to `PISKEL_ROOT=../piskel`; override with `PISKEL_ROOT=/path/to/piskel`).

`npm publish` runs `assert-vendor` and will **fail** if `vendor/piskel-prod/index.html` is missing, so the npm package always ships the static editor for `serve`.
