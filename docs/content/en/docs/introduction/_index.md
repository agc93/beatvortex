---
title: "Introduction"
linkTitle: "Introduction"
weight: 1
description: >
  A basic introduction to BeatVortex
---

BeatVortex is an **unofficial** extension for the [Vortex mod manager](https://www.nexusmods.com/about/vortex/) that adds support for installing and managing Beat Saber mods in Vortex, just like any other supported title. To clarify, this project is not affiliated in any way with Nexus Mods, Beat Games or anyone else, and is an open-source community resource.

## Status and Limitations

BeatVortex is still beta-quality software! While I can test locally, I won't be able to cover every case and there is a high potential for bugs that haven't been found yet. The following is definitely supported at this point:

- **Installing mods**: Installing mods or maps from archive files works, deploying directly to your install directory.
- **Managing mods**: The standard Vortex install/enable/disable/uninstall operations should all work just as they do for any other Vortex-managed game.
- **Finding new mods**: Most mods can be browsed directly using the built-in BeatMods browser. Using the "Get more mods" menu in Vortex to download mods should automatically install them with Vortex.
- **Profiles**: Create multiple profiles for different sets of mods or songs and quickly switch between them.
- **OneClick installs**: There is *preview* support for OneClick installs from BeatSaver and ModelSaber allowing you to install and manage songs easier than ever.
- **Dependencies**: Vortex's support for dependencies is....complicated but as of Alpha 3, BeatVortex will warn you about missing dependencies, and attempt to automatically install them.
- **Updates**: Vortex's native update check will now check for and install updates for any of your mods from BeatMods

There's some features that we've included to get them in your hands as fast as possible, but might still have some rough edges:

- **Playlists**: BeatVortex natively supports installing and managing playlists, and there is also a playlists manager in Vortex that [you can enable](/docs/usage/playlists/#preview-feature-playlists-view)
- **[Sync](/docs/usage/sync)**: A lightweight alternative to BeatSyncConsole, this preview feature can sync and install your bookmarked maps from BeastSaber

Finally, there's a few things that anyone used to other tools might miss though, as we haven't implemented them yet:

- **Previews/metadata**: Vortex regards songs as just another type of mod, so you won't get the level of details, stats or previews that something like BeatDrop gives you.
- **Error Handling**: BeatVortex's error handling is pretty barebones. You might see more errors and odd behaviours during installs.

> If you're really missing specific features you can open an issue and we can discuss the viability, or find me on the BSMG Discord.

### Nexus Mods

To be clear and upfront: being supported in Vortex (using BeatVortex) **does not** mean that mods or songs will be available on Nexus Mods, nor does Nexus Mods **officially** support Beat Saber. BeatVortex itself includes support for BeatMods and BeatSaver/BeastSaber, but Nexus does not host Beat Saber mods. See [the FAQ](/docs/introduction/faq) for extra details.