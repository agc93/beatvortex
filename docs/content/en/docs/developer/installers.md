---
title: "Installer Logic"
linkTitle: "Installers"
weight: 95
description: >
  A deep dive into how BeatVortex handles the actual mod installation.
---

{{% pageinfo %}}
The information below **only** applies to BeatVortex versions from 0.3 onwards. Installation logic was completely rebuilt in 0.3.0.
{{% /pageinfo %}}

BeatVortex's installation logic is *slightly* over-engineered in order to meet a few design goals:

1. Handle different mod types invisibly
1. Abstract away the actual download source of a mod
1. Handle both installation and metadata in a Vortex-friendly way.

### Background

As it stands, BeatVortex only registers a single installer (`bs-content`) to Vortex and handles all the rest of the installation logic inside that one installer. That means this installer handles all the available mod types: BeatMods-style plugin mods, song maps (from BeatSaver or not), models (from ModelSaber or not) and a generic fallback for anything else.

One of the biggest conceptual changes is differentiating the mod type and the mod source. The mod type will control how BeatVortex creates install instructions, and varies for plugins, maps, models or generic files. The mod source will control how BeatVortex provides metadata about the mod and varies for the supported sources: BeatMods, BeatSaver/BeastSaber, and ModelSaber.

The `FileInstaller` interface is used by an installer implementation for a mod *type* and controls how install instructions are created from a given file list. The `ModInstaller` interface is a higher-level wrapper over the `FileInstaller` that can be used for a mod *source* to encapsulate both the expected file format (from a `FileInstaller`) and handle any install-time metadata, by returning `attribute` instructions with the install instructions.

### Future Refactoring

This new system will probably be refactored again in a future release. As it stands, BeatVortex is doing a lot of installation logic that Vortex could really be doing. Future releases will likely replace the existing `ModInstaller`/`FileInstaller` layer with a combination of new Vortex-registered installers and improved metadata handling. Raise a GitHub issue before doing any drastic work around mod installation.