---
title: "Metadata and Meta Servers"
linkTitle: "Vortex Metadata"
weight: 50
description: >
  How BeatVortex handles mod metadata and some extra features.
---

{{% pageinfo %}}
The information below is not necessary for just using Vortex to handle your mods. It is included below for transparency and for the interest of curious users.
{{% /pageinfo %}}

There's a few extra moving parts needed in BeatVortex since we don't use Nexus Mods for hosting mods. The most important one of these is what Vortex calls a "meta server". The extension automatically adds a special meta server to your Vortex configuration when it starts up.

## Meta Servers

Metaservers are essentially a thin API used to retrieve mod-related metadata for a given **file**. That's an important distinction: metaservers are not used to find *or* download mods, they're used to get more information about a mod that the client already knows about.

The API for metaservers is part of the [Nexus-Mods/modmeta-db](https://github.com/Nexus-Mods/modmeta-db) library, but the one used in BeatVortex has its own implementation

#### Example: Dependencies

When you install a mod with BeatVortex (let's use ScoreSaber as an example), the extension will read information from BeatMods to determine its dependencies. Our extension (and therefore Vortex) now know that ScoreSaber needs a certain version of SongCore and BeatSaberMarkupLanguage.  What it doesn't know is **where to find them**. Vortex then calls its configured meta servers to find our more information about "SongCore" and "BeatSaberMarkupLanguage", and our server responds with all the information it can pull from BeatMods including the most important part: where to get those files.

## BeatVortex Metaserver

So with the background out of the way, what does this have to do with BeatVortex? Well, since we don't use Nexus, we depend on a metaserver for a lot of the metadata used during mod installation. Notably, we also rely on a metaserver for full dependency resolution (see above).

> BeatVortex still works just fine without the metaserver, but at reduced functionality. For example, Vortex will detect and warn about missing dependencies, but it can't automatically install them without the metaserver.

So, to save every user having to run their own server (or running one locally out-of-process), we add a shared metaserver (`meta-beatvortex`) at startup. This metaserver gets queried by Vortex whenever a user installs a mod. We actually ignore the "default" query that Vortex uses, since BeatMods doesn't support it. If the server receives a query for a specific dependency though, the server will query the BeatMods API for a matching mod and return some basic info on the mod to Vortex.

## FAQ

### What information does the metaserver get?

The BeatVortex metaserver in particular responds to two queries: `by_key` and `by_name`. The `by_key` query is a single MD5 hash of a file currently being installed. We ignore these, since BeatMods doesn't support them. The `by_name` query is a simple API call with two parts: a name (like `SongCore`) and a version (like `^2.9.1`). The server won't see any other details from your installation or settings.

### Can I run my own metaserver?

Yes! The code our server uses is [open source on GitHub](https://github.com/agc93/modmeta-relay) and easy enough to run on your own. Just run the server, add the BeatVortex plugin, then add its publicly accessible URL to your Vortex configuration.

### Can the metaserver be turned off?

Yes, but you probably shouldn't. Unless you're testing your own server or something, it's best to leave it enabled. Disabling the metaserver will immediately remove the server from Vortex's configuration meaning anything that depends on a metaserver will stop working. Most notably, dependencies won't automatically be downloaded/installed anymore!

> There was also a bug in Vortex versions prior to 1.12.3 where disabling metaservers didn't actually remove them which could cause problems during install.