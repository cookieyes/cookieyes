<script lang="ts">
import RecallButton from "../../controls/RecallButton.svelte";
import CookieBanner from "../../presets/CookieBanner.svelte";
import CookieOptOut from "../../presets/CookieOptOut.svelte";
import CookiePreferences from "../../presets/CookiePreferences.svelte";
import ReloadNotice from "../../presets/ReloadNotice.svelte";
</script>

<CookieBanner />
<CookiePreferences />
<CookieOptOut />
<ReloadNotice />
<RecallButton />
