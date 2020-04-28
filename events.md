Not all of Vortex's events are properly documented. Here's a list of the ones I've used:

Closest thing to an authoritative list is [this](https://cdn.discordapp.com/attachments/465847241005989898/695545152973832192/unknown.png) and [this](https://cdn.discordapp.com/attachments/465847241005989898/695545322021322802/unknown.png).

| Name  | Call Signature | Comments |
| ------------- | ------------- | --- |
| `will-purge`  | `(profileId: string, {[modType: string]: types.IDeployedFile[];}): Promise<null>`||
| `did-purge`  | `(profileId: string): Promise<void>`|