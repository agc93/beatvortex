---
title: "Dependency Management"
linkTitle: "Dependencies"
weight: 92
description: >
  A deep dive into how BeatVortex handles mod dependencies.
---

{{% pageinfo %}}
The information below **only** applies to BeatVortex versions from 0.3 onwards. Installation logic was completely rebuilt in 0.3.0.
{{% /pageinfo %}}

Dependency management in Vortex is always a bit of a mess and it's especially so if you're *not* using Nexus Mods, which we are definitely not. As it stands, BeatVortex can notify you about missing dependencies but won't automatically install them.

> We're actively working with the Vortex team to understand how to better support non-Nexus dependencies.

There's some limitations in how Vortex/`modmeta-db`/BeatVortex/BeatMods interact that makes this story surprisingly hard.

#### BeatMods doesn't have MD5s for archives

The backing logic for Vortex's dependency management happens inside the `modmeta-db` library. This library allows for querying metadata (including dependencies) using a single identifying key for a mod download: the MD5 sum of the archive. Unfortunately, BeatMods **does not** store the hash of archive files, only of the individual files. This means we can't do on-demand lookups (through `modmeta-db`) for mod files.

#### BeatMods does dependencies weird

The BeatMods API, for reasons likely lost to time, returns dependencies from the API in a super-weird way: top-level dependencies are fine, but *their* dependencies are only returned as document IDs, meaning we can't easily go from a single API call to a full dependency tree.

#### Vortex doesn't fully implement `modmeta-db`

The backing `modmeta-db` supports looking up mod files by a couple of different "keys": MD5 hash (see above), logical file name, and custom file expressions. At present, since Nexus uses MD5 hashes, Vortex pretty much only uses the MD5 hash for *installation*. That means we can (and do) specify dependency rules, but Vortex won't know where to *find* those dependencies.

In future, we should be able to provide a working meta server that can tell Vortex where to find a particular logical file name/version combo (i.e. the correct file on BeatMods), but this doesn't seem to work exactly right at current.

> It's our understanding that BeatVortex is the only game extension handling non-Nexus dependencies so this is uncharted ground.

#### BeatMods provides only basic dependency information

BeatMods dependencies can essentially be summarised down to a mod name and specific version. In practice, this is generally *enough* and mod managers (whether it's BeatVortex or Mod Assistant) can just install that version. The only problem here is that we are now locking depenencies to very specific package versions which Vortex now has to take a hard-and-fast restriction.

As a middle ground, BeatVortex assumes that mod authors are following Semantic Versioning (SemVer) correctly and matches major versions only. That means that, for example, a mod asking for SongCore 2.7.5 could have SongCore 2.9.x installed.

> We're using the `~` operator for those already familiar with the Node/npm semver format.