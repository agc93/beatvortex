---
title: "Alpha 4.1 Release"
linkTitle: "Release 0.4.1"
date: 2020-08-11
draft: true
aliases:
  - /updates/niobium
  - /updates/v0.4.1
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}


This release adds some new features and fixes to the [previous major alpha release](/updates/v0.4.0) including:

- Improved updates experience
  - Installing updates from your Mods screen will now allow you to keep both versions installed
  - You should also see less "duplicate" mod installs
- Improved BSMG Services dialog
  - Cleaned up the WIP interface to be more readable and streamlined
- Adds new in-app notices feature
  - This will show notifications when you activate Beat Saber (or launch Vortex with Beat Saber active) with any critical messages
  - You will likely see these messages in future as BeatMods and BeatSaver are both undergoing breaking API changes that may impact BeatVortex
- Behind-the-scenes improvements to API code
  - The API calls used for BSMG sites should be a little more stable
  - Views that used a lot of API calls (Playlists, Sync, BeatMods) should also error out less
- Other minor improvements
  - Attributes for custom maps (BPM, artist name, map modes) will be hidden when not applicable
  - Minor improvements to game upgrade handling

There was a lot of changes in 0.4.0, so make sure you check [those release notes](/updates/v0.4.0) if you haven't already.

As with 0.4.0, the changes introduced in this release require some new features and fixes only available in Vortex 1.3 and above. As such, this version is **only** supported in Vortex 1.3.x. If you're still using Vortex 1.2.x, you can continue using BeatVortex 0.3.9. Check [this post](/blog/2020/07/22/vortex-beatvortex-and-updates/) for more information on how we're handling supported updates.

### Alternate Downloader Support

This update also includes a new option to enable an "Alternate BeatMods Downloader". This has been included purely as a workaround for bugs in BeatMods that can upset Vortex's integrated download manager. Please only enable this if you cannot install mods from the BeatMods browser, and you really know what you're doing!