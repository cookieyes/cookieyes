import { defineEventHandler } from "#imports";
import { _stylesResponse } from "../../styles-response.js";

// Imported from Nitro's "#imports", not "h3": this file is bundled into the app's server, where
// "h3" is not resolvable from this package under a strict node_modules layout.
export default defineEventHandler((event) => _stylesResponse(event.headers.get("accept-encoding")));
