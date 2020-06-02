---
title: "Translating BeatVortex"
linkTitle: "Translation"
weight: 98
description: >
  Translating BeatVortex's interface elements.
---

{{% pageinfo %}}
The information below **only** applies to BeatVortex versions from 0.3.1 onwards. Versions prior to 0.3.1 did not include the code necessary to support translations.
{{% /pageinfo %}}

Vortex includes built-in translation support and there's already quite a few translations [available on Nexus Mods](https://www.nexusmods.com/site/mods/categories/7/). Any of the "common" interface elements from Vortex that are used in BeatVortex (things like menus, tables and common buttons) will all use the language you specify in Settings (under Interface).

> For general information on translation support in Vortex, check out the [Vortex wiki](https://wiki.nexusmods.com/index.php/Translating_Vortex)

However, there's quite a few Beat Saber-specific parts that we add to Vortex, and these won't automatically be translated. Of particular note are the BeatMods browser, Beat Saber-specific settings and some dialogs and notifications. We've built support for translating these elements but that requires actual, you know, translations!

## Building Translations

If you're already familiar with Vortex (or `react-i18next`-based) translations then the short version is that BeatVortex uses a separate `beatvortex` namespace (and `beatvortex.json` file) to get localised strings.

More specifically, Vortex will **usually** look for a `beatvortex.json` file inside `%APPDATA%/Vortex/resources/locales/<ISO-CODE>` and use any translated strings it finds there, falling back to English if none is found.

However, we've added an extra convention to make translations a bit easier: the extension contains a file called [language_en.json](https://github.com/agc93/beatvortex/blob/master/src/language_en.json) with all the currently translateable English strings. When Vortex starts up, BeatVortex will load in any `language_<code>.json` files it finds, so you can create a `language_fr.json` file to add French translations or a `language_ru.json` file to add Russian translations.

> Once installed, these files will be at `%APPDATA%/Vortex/plugins/game-beatsaber/`. You can manually create these files while translating.

Once you have a translation, open a PR to add the file to the repository and we'll push your translation out with the next update!

### Existing Translations

If you are working on, or maintaining, an existing Vortex translation, you can add BeatVortex support by adding a `beatvortex.json` file to your translation package for the BeatVortex-specific strings. A loose example file that should over most elements is available at [beatvortex.dev/beatvortex_en.json](https://beatvortex.dev/beatvortex_en.json) that translators can use for a good starting point.

> We haven't worked with Vortex translations much before: please raise an issue if something doesn't look right or needs changing!

## Documentation

This documentation, like the extension code, is [all open-source](https://github.com/agc93/beatvortex/blob/master/docs/). If you'd like to help out with translating the documentation, you're an amazing person! Our docs builder (Hugo with Docsy) is capable of supporting multiple languages using folders under the `docs/content/` path (for example, `docs/content/es` or `/docs/content/de`). If you submit a PR with any translated docs, we will enable that language in our site build and your translated docs will be available when we next publish.
