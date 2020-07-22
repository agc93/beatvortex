---
title: "Vortex, BeatVortex and Updates"
linkTitle: "Vortex Updates"
date: 2020-07-22
description: >
  An update on BeatVortex updates and Vortex compatibility
---
Hey everyone!

Thanks as always for using BeatVortex!

As I've been adding more features, fixes and more tightly integrating with both Vortex and Beat Saber, the extension itself has been growing in complexity quite dramatically. BeatVortex is now made up of almost 4000 lines of code and is one of the more complex Vortex extensions around today. As such, adding new features and fixes can be quite a complex affair.

For that reason, I want to be clear about a change I'm making around updates: going forward, each major version of BeatVortex will only be **supported** on the current Vortex version when it's released or later. For example, when I released 0.3.1, Vortex was up to 1.2.13, so BeatVortex 0.3.x would support any version of Vortex from 1.2.13 onwards.

This is mostly important for upcoming releases: BeatVortex 0.4.x will **only** be supported on Vortex 1.3 or later. I'll do my best to make sure newer versions still *run* with older Vortex versions, but I can't provide support or guarantee there won't be problems. If you have automatic Vortex updates enabled, or update regularly, this shouldn't really affect you!

As always, if you have problems, questions or feedback, feel free to [leave a comment](https://www.nexusmods.com/site/mods/96?tab=posts) or [raise an issue](https://github.com/agc93/beatvortex/issues). If you're curious, I've included a bit more detail on this decision below.

---

There's two major things that control what Vortex versions BeatVortex can support: features and fixes. The simple one is features: if BeatVortex wants to use a new feature or API only included in newer releases, then we need to require that version of Vortex. For example, that was the case for resolving dependencies, some installation features and the upcoming features in 1.3.x. The burden here is that newer versions of BeatVortex might be installed in Vortex versions that don't include those features.

Fixes is the much more complicated one, but also usually the "harder" limit of the two. In the process of building BeatVortex, I've found a number of bugs and inconsistencies in Vortex that the team has been great about fixing. While some of them are pretty minor (like [this](https://github.com/Nexus-Mods/Vortex/issues/6315) or [this](https://github.com/Nexus-Mods/Vortex/issues/6322)), a few of the bugs we've picked up have been fatal for some or all of BeatVortex. Issues in things like [mod types](https://github.com/Nexus-Mods/Vortex/issues/6268), [dependency resolution](https://github.com/Nexus-Mods/Vortex/issues/6283), and [mod updates](https://github.com/Nexus-Mods/Vortex/issues/6567) can be pretty much fatal and can be harder to handle. For example, anyone using Vortex <1.2.17 would get an error *every time they checked for updates* and someone using Vortex <1.2.12 would get warning about conflicts even where there weren't any.

If you're curious where this whole change came from, it was an upcoming feature in 1.3: dynamic tool parameters. The Vortex team added one of my [requested features](https://github.com/Nexus-Mods/Vortex/issues/6629) so we can pass arguments to BSIPA dynamically. However, implementing that meant refactoring a ton of old code in a not-very-backwards-compatible way so it won't work quite right with anything before 1.3.

