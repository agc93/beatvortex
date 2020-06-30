---
title: "Alpha 3.6 Release"
linkTitle: "Release 0.3.6"
date: 2020-06-30
aliases:
  - /updates/krypton
  - /updates/v0.3.6
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This is another major bugfix release for the [previous alpha release](/updates/v0.3.5).

This includes fixes for two major bugs:

- Game detection failing or not discovering Beat Saber could crash the Settings page
  - Most relevant settings should now only show up if you're actually managing your Beat Saber installation with Vortex
- Metaserver registration has been patched to avoid a sort-of-bug in modmeta-db
  - Dependency resolution should be working again
- Automatic game update detection has been disabled by default
  - This feature hasn't been tested enough for my liking and was causing some earlier bugs so I have disabled it by default for now.

For the major updates in this release, please check the [docs for the previous feature release](/updates/v0.3.3).

### A note on bugs

This release is fixing yet more bugs in the 0.3.x tree, but should also be improving overall polish. If you do find more bugs, *please* reach out on GitHub or Discord and I will do my best to get things fixed as quick as I can.

Big thanks (as always) to Pickysaurus, Tannin and Nagev for helping out with these bugs and being great about the whole thing.