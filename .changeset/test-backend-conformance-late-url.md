---
"@cookieyes/test": patch
---

`runBackendConformance` reads the server's URL when each check runs, so a server started in `beforeAll` works.

**Fixed: a server on a free port could not be tested.** The suite read `url` when it registered its checks, before a `beforeAll` hook had started the server and learned its port, so every check sent its request to an empty URL. Setting `url` on the target object in `beforeAll` now works.
