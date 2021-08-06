---
title: "Alpha 5.0 Release"
linkTitle: "Release 0.5.0"
date: 2021-08-06
aliases:
  - /updates/tin
  - /updates/v0.5.0
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release is a pretty big update to catch up to some changes in the BSMG services and fix some long-running bugs and issues:

- Updated to latest BeatSaver API
  - BeatSaver has been transitioned to a new owner and new service, which unfortunately completely broke API compatibility
  - BeatVortex now uses the new BeatSaver API so map details and installation should work properly again
  - Given the rushed nature of these changes, please report any issues you find.
- Improvements to BeatMods updates
  - Some changes in Vortex ended up making BeatMods updates a lot less consistent than they should have been
  - You should now have a much smoother time updating mods and resolving dependencies
- Refactored a *lot* of things under the covers
  - Dependencies have been updated, libraries have been brought in, code has been refactored out...
  - There's a lot here but _hopefully_ you shouldn't notice any of it!

There was a lot of changes in this release, just most of them were behind the scenes, so make sure to check the [earlier release notes](/updates/) if you need to get caught up.

As with 0.4.0, the changes introduced in this release require some new features and fixes only available in Vortex 1.4 and above. As such, this version is **only** supported in Vortex 1.4.x. If you're still using Vortex 1.3.x, you can continue using BeatVortex 0.4.3. Check [this post](/blog/2020/07/22/vortex-beatvortex-and-updates/) for more information on how we're handling supported updates.

### BeatMods mod availability

Most mods should now be available from BeatMods for the latest game update as authors update their mods. If you cannot find or install mods after a game update, check if they are available on [BeatMods](https://beatmods.com). They may not have been updated for the latest game version.