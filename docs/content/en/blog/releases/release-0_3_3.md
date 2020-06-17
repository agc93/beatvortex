---
title: "Alpha 3.3 Release"
linkTitle: "Release 0.3.3"
draft: true
date: 2020-06-16
aliases:
  - /updates/arsenic
  - /updates/v0.3.3
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release adds some new features and fixes to the [previous alpha release](/updates/v0.3.2) including:

- Added *preview* support for automatic updates for BeatMods mods!
  - This has barely been tested, and we're in uncharted territory, so only enable this one if you're truly brave.
  - Enable them from the Settings page then click *Check for Updates* in your Mods list to check for updates from BeatMods
- Session caching: we've started integrating caching support for BeatMods and BeatSaver.
  - This should pretty dramatically cut down the load on those services by caching requests for the current session.
- Playlist Management improvements
  - There's been a lot of behind-the-scenes updates to the Playlists manager that should make it snappier and stabler.
  - We've also fixed the pretty huge bug where the map list would be for the wrong playlist.

As with [v0.3.1](/updates/v0.3.1), this release requires the features and fixes from recent Vortex updates and we **strongly** recommend only using this version of the extension with Vortex 1.2.17 *or higher*.

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your settings and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

### Updating mods for fun and profit

Beat Saber is now the first game to support Vortex's mod updates from anywhere other than Nexus Mods! We've been working with the Vortex/Nexus Mods team to test out this functionality (and [iron out the kinks](https://github.com/Nexus-Mods/Vortex/issues/6567)), but it's now possible to use Vortex's built-in updates tools without using Nexus Mods.