<script lang="ts">
import {
  useBannerVisibility,
  useCategories,
  useConsent,
  useConsentCategory,
  useLanguage,
  useOptOutOpen,
  usePreferencesOpen,
  useRegion,
  useRegulation,
  useReloadNotice,
  useTranslations,
} from "../../index.js";

// Reads every state hook in the template, so a server render touches all of them.
const consent = useConsent();
const analytics = useConsentCategory("analytics");
const regulation = useRegulation();
const region = useRegion();
const visible = useBannerVisibility();
const prefs = usePreferencesOpen();
const optOut = useOptOutOpen();
const language = useLanguage();
const notice = useReloadNotice();
const t = useTranslations();
const categories = useCategories();
</script>

<pre data-probe>{JSON.stringify({
    hasActed: consent.hasActed,
    categories: consent.categories,
    analytics: analytics.current,
    regulation: regulation.current,
    region: region.regulation,
    visible: visible.current,
    prefs: prefs.current,
    optOut: optOut.current,
    language: language.language,
    reload: notice.required,
    title: t.bannerTitle,
    ids: categories.ids,
  })}</pre>
