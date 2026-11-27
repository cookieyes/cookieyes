import { config, dev, head } from "virtual:cookieyes/config";
import { _createHandler } from "./handler.js";

/**
 * @internal Registered by the integration with `addMiddleware`; never imported by a site. The
 * virtual module holds the JSON part of the integration's options and the head tags it built.
 */
export const onRequest = _createHandler({ config, head, dev });
