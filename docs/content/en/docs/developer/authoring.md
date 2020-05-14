---
title: "Packaging for Mod Authors"
linkTitle: "Packing Mods"
weight: 91
description: >
  Extra information for mod authors on maximizing compatibility with BeatVortex
---

In general, if your mod is compatible with Mod Assistant, it will work with BeatVortex! See below for some extra information on how different mod types are handled.

### Song Maps

BeatVortex includes special logic for installing song maps. As long as your mod archive includes any `.dat` or `.egg` files, the installer will automatically extract the archive into its own directory under the `Beat Saber_Data/CustomLevels` directory.

If your map is being downloaded from BeatSaver using either OneClick or the ZIP archive, BeatVortex will try and fetch metadata for the map during installation. Once installed, the map will have its source set to "BeatSaver" and metadata should be available in the details panel.

For maximum compatibility, *don't* nest map files under `Beat Saber_Data` inside the ZIP file. It should still install correctly, but Vortex will think your map is actually a plugin and might not handle things exactly right.

> **Do not** change the mod type for installed maps, or they will be deployed to the wrong place.

### Models (Avatars, Sabers and Notes)

BeatVortex will pick up that a mod is installing a model based on two conditions: theres only one file and it ends with `.avatar`, `.platform` or `.saber`. As long as those are true, BeatVortex will automatically install the model to its appropriate `Custom` folder in the Data directory.

If the model has been downloaded from ModelSaber, BeatVortex will try and fetch metadata for the model during installation. Once installed, the model will have its source set to "ModelSaber" and some basic metadata should be available in the details panel.

### Plugin Mods

Mods that don't get picked up as either a song map or custom model (see above) will be *assumed* to be plugin mods. These mods are automatically installed to the root of the installation directory.

If a mod has been downloaded from BeatMods, BeatVortex will try and fetch metadata for the mod during installation. This is also true for installs using OneClick (assuming the user has enabled Vortex to handle OneClick links). During installation, BeatVortex will try and pull all the metadata it can from BeatMods including all the basic information, mod version **and dependencies**.

### Type Detection

At present, BeatVortex's methods of detecting what mod types are in use is pretty barebones:

- Mod types are determined by presence of specific files/paths. Maps have `.dat|.egg`, models have `.saber|.platform|.avatar`, etc
- Mod sources are determined by matching the format of the name of the archive. It's horrible and hacky, but works for now.