---
title: "Alpha 3.5 Release"
linkTitle: "Release 0.3.5"
date: 2020-06-28
aliases:
  - /updates/bromine
  - /updates/v0.3.5
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This is a major bugfix release for the [previous alpha release](/updates/v0.3.4).

This includes fixes for two major bugs:

- Path detection failing would cause the extension to fail to load
  - As it turns out, there's scenarios where Vortex knows about a game, but not where it's installed. This should now be handled properly.
- Playlist creation was shown for all games, not just Beat Saber
  - This was a stupid mistake. I've tried to isolate Beat Saber-specific functionality to managing Beat Saber mods and missed this.

For the major updates in this release, please check the [docs for the previous feature release](/updates/v0.3.3).

### A note on bugs

This is the first release to have to fix multiple major (fatal!) bugs, and I should have caught these earlier. To those of you affected by these, I will be trying to ensure releases are more polished before I publish them in future. These were both stupid bugs and should never have hit users the way they did. 

Big thanks (as always) to Tannin and Pickysaurus for helping out with these bugs and being great about the whole thing.