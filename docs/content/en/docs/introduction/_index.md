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
- **Finding new mods**: Using the "Get more mods" menu in Vortex to download mods should automatically install them with Vortex saving a few clicks.
- **Profiles**: Create multiple profiles for different sets of mods or songs and quickly switch between them.
- *One-click installs*: There is some very early *preview* support for one-click installs from BeatSaver allowing you to install and manage songs easier than ever.

There's a few things that anyone used to other tools might miss though, as we haven't implemented them yet:

- **Dependencies**: Vortex's support for dependencies is....sketchy. BeatVortex doesn't support dependencies right now so make sure you install any dependencies.
- **Previews/metadata**: Vortex regards songs as just another type of mod, so you won't expect the level of details, stats or previews that something like BeatDrop gives you.
- **Error Handling**: BeatVortex's error handling is pretty...barebones. You might see more errors and odd behaviours during installs.

> If you're really missing specific features you can open an issue and we can discuss the viability, or find me on the BSMG Discord.

### Nexus Mods

To be clear and upfront: being supported in Vortex (using BeatVortex) **does not** mean that mods or songs will be available on Nexus Mods, nor does Nexus Mods **officially** support Beat Saber. BeatVortex itself includes support for BeatMods and BeatSaver/BeastSaber, but Nexus does not host Beat Saber mods. See [the FAQ](/docs/introduction/faq) for extra details.