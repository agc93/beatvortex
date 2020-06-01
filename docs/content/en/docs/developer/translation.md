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

However, there's quite a few Beat Saber-specific parts that we add to Vortex, and these won't automatically be translated. Of particular note are the BeatMods browser, Beat Saber-specific settings and some dialogs and notifications. We've built support for translating these elements but that requires atual, you know, translations!

## Building Translations

If you're already familiar with Vortex (or `react-i18next`-based) translations then the short version is that BeatVortex uses a separate `beatvortex` namespace (and `beatvortex.json` file) to get localised strings.

More specifically, Vortex will look for a `beatvortex.json` file inside `%APPDATA%/Vortex/resources/locales/<ISO-CODE>` and use any translated strings it finds there, falling back to English if none is found.

### Existing Translations

The ideal scenario would be for existing Vortex translations to support BeatVortex's namespace by adding a `beatvortex.json` to their translations. A loose example file that should over most elements is available at [beatvortex.dev/beatvortex_en.json](https://beatvortex.dev/beatvortex_en.json) that translators can use for a good starting point.

> We haven't worked with Vortex translations much before: please raise an issue if something doesn't look right or needs changing!

