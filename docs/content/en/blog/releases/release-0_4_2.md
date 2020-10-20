---
title: "Alpha 4.2 Release"
linkTitle: "Release 0.4.2"
date: 2020-10-19
aliases:
  - /updates/molybdenum
  - /updates/v0.4.2
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release is a minor fix for the [previous alpha release](/updates/v0.4.1) including:

- Improved game version detection
  - Currently, BeatVortex doesn't correctly read the game version for version 1.12 and later
  - This update should resolve this and correctly identify newer game versions
- Fixed some caching errors
  - Previously some important requests were being cached more than intended
- Minor behind-the-scenes improvements

There was a lot of changes in [0.4.0](/updates/v0.4.0) and [0.4.1](/updates/v0.4.1), so make sure you check those release notes if you haven't already.

As with 0.4.0, the changes introduced in this release require some new features and fixes only available in Vortex 1.3 and above. As such, this version is **only** supported in Vortex 1.3.x. If you're still using Vortex 1.2.x, you can continue using BeatVortex 0.3.9. Check [this post](/blog/2020/07/22/vortex-beatvortex-and-updates/) for more information on how we're handling supported updates.

### BeatMods mod availability

You might have noticed that there are no updated game mods available from BeatMods. This is expected after new game versions, and mods will likely be available for 1.12.2 and later in the coming days/weeks.