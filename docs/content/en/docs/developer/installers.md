---
title: "Installer Logic"
linkTitle: "Installers"
weight: 95
description: >
  A deep dive into how BeatVortex handles the actual mod installation.
---

{{% pageinfo %}}
The information below **only** applies to BeatVortex versions from 0.3 onwards. Installation logic was completely rebuilt in 0.3.0 (and again in 0.3.1).
{{% /pageinfo %}}

BeatVortex's installation logic is *slightly* over-engineered in order to meet a few design goals:

1. Handle different mod types invisibly
1. Abstract away the actual download source of a mod
1. Handle both installation and metadata in a Vortex-friendly way.

### Background

As of 0.3.1, BeatVortex registers three separate installers to handle each of the available mod types: BeatMods-style plugin mods, song maps (from BeatSaver or not), models (from ModelSaber or not). The plugin mod installer also serves as a fallback installer. Vortex is responsible for selecting the installer to use based on basic test conditions (`isSongMod` and `isModelMod` in particular).

One of the biggest conceptual changes is differentiating the mod type and the mod source. The mod type will control how BeatVortex creates install instructions, and varies for plugins, maps, models or generic files. The mod source will control how BeatVortex provides metadata about the mod and varies for the supported sources: BeatMods, BeatSaver/BeastSaber, and ModelSaber.

The `ModInstaller` interface is used by an installer implementation for a mod *type* and controls how install instructions are created from a given file list. The `MetadataSource` interface is a separate optional abstraction that can be used for a mod *source* to handle any install-time metadata, by returning `attribute` instructions to be combined with the original install instructions.

### Future Refactoring

This new system is a major rework and definitely not guaranteed stable. As it stands, BeatVortex still has a lot of touch points between Vortex, the extension, the installers and the metadata sources. Future releases will likely tweak the existing `ModInstaller`/`MetadataSource` layers to make things a little clearer and handle failures better. Raise a GitHub issue before doing any drastic work around mod installation.