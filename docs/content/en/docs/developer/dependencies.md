---
title: "Dependency Management"
linkTitle: "Dependencies"
weight: 96
description: >
  A deep dive into how BeatVortex handles mod dependencies.
---

{{% pageinfo %}}
The information below **only** applies to BeatVortex versions from 0.3 onwards. Installation logic was completely rebuilt in 0.3.0.

Additionally, dependencies are an area of very active development and things are changing rapidly. Docs may be a little slow to update.
{{% /pageinfo %}}

Dependency management in Vortex is always a bit of a mess and it's especially so if you're *not* using Nexus Mods, which we are definitely not. As it stands, BeatVortex can notify you about missing dependencies and will **attempt** to install them for you when you install a mod.

> It's our understanding that BeatVortex is the only game extension handling non-Nexus dependencies so this is uncharted ground.

There's some limitations in how Vortex/`modmeta-db`/BeatVortex/BeatMods interact that makes this story surprisingly hard.

#### BeatMods doesn't have MD5s for archives

The backing logic for Vortex's dependency management happens inside the `modmeta-db` library. This library allows for querying metadata (including dependencies) using a single identifying key for a mod download: the MD5 sum of the archive. Unfortunately, BeatMods **does not** store the hash of archive files, only of the individual files. This means we can't do on-demand lookups (through `modmeta-db`) for mod files.

#### BeatMods does dependencies weird

The BeatMods API, for reasons likely lost to time, returns dependencies from the API in a super-weird way: top-level dependencies are fine, but *their* dependencies are only returned as document IDs, meaning we can't easily go from a single API call to a full dependency tree. Thankfully, Vortex (mostly) has our back here, and can do basic-but-good-enough dependency resolution.

#### Vortex doesn't fully implement `modmeta-db`

The backing `modmeta-db` supports looking up mod files by a couple of different "keys": MD5 hash (see above), logical file name, and custom file expressions. At present, since Nexus uses MD5 hashes, Vortex mostly just uses the MD5 hash for installation. In earlier versions of Vortex, that meant we could specify dependency rules, but Vortex wouldn't know where to *find* those dependencies.

Vortex releases from 1.2.12 added support for looking up mod dependencies using a logical file name, meaning we can now use a metaserver (essentially an implementation of `modmeta-db` over REST) to return information on dependencies, including where to find them (i.e BeatMods). Finally, Vortex releases from 1.12.3 onwards improved dependency resolution so that BeatMods extensions installed from archives or the browser should automatically install all the required dependencies.

> A huge thanks to the Nexus/Vortex team, who have been very helpful in expanding and explaining Vortex's dependency support. Thanks Tannin!

We now add a metaserver at startup that returns metadata and dependency information for all the mods available on BeatMods. This behaviour can be toggled off in the Settings if desired. With the metaserver disabled, Vortex will still warn on missing _immediate_ dependencies, but it won't be able to automatically install them, or build a full dependency tree.

#### BeatMods provides only basic dependency information

BeatMods dependencies can essentially be summarised down to a mod name and specific version. In practice, this is generally *enough* and mod managers (whether it's BeatVortex or Mod Assistant) can just install that version. The only problem here is that we are now locking depenencies to very specific package versions which Vortex now has to take a hard-and-fast restriction.

As a middle ground, BeatVortex assumes that mod authors are following Semantic Versioning (SemVer) correctly and matches major versions only. That means that, for example, a mod asking for SongCore 2.7.5 could have SongCore 2.9.x installed.

> We're using the `^` operator for those already familiar with the Node/npm semver format.