<script lang="ts">
import { useConsent } from "../../index.js";

const consent = useConsent();
</script>

<b>{consent.hasActed}:{consent.committedCategories.analytics}</b>
