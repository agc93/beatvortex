---
title: "Alpha 2.2 Release"
linkTitle: "Release 0.2.2"
date: 2020-04-19
aliases:
  - /updates/titanium
  - /updates/v0.2.2
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release is a bugfix and feature release hotfix for the [previous alpha release](/blog/2020/04/17/alpha-2.1-release/)

This hotfix corrects the following bugs:

- The extension would attempt to register assets before loading had finished
  - This *should* silently fail in Vortex 1.1.x, but 1.2 will throw an error.

Huge thanks to @Pickysaurus for spotting and reporting this bug!