import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { DocsHeader } from "@/components/docs/DocsHeader";
import { SidebarControls } from "@/components/docs/SidebarControls";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

/** Versions with published content. See VersionSelect for why the design's older
 *  entries are not listed. */
const VERSIONS = ["v1.4"];

/**
 * The notebook layout, not the `docs` one: the design puts a full-width 64px header
 * above both the sidebar and the content, which is what notebook renders. The `docs`
 * layout instead folds the logo and search into the top of the sidebar.
 *
 * `slots.header` swaps in our own header so the controls sit in the design's order
 * rather than Fumadocs' — see DocsHeader for why CSS alone could not do it.
 *
 * The theme toggle lives in the header (see DocsHeader), matching the design's real
 * `#themeBtn`; the sidebar carries no footer control.
 */
export default function Layout({ children }: LayoutProps<"/docs">) {
  const { nav, ...base } = baseOptions();

  const sidebarControls = <SidebarControls key="cy-sidebar-controls" versions={VERSIONS} />;

  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{ ...nav, mode: "top" }}
      tabMode="sidebar"
      slots={{ header: DocsHeader }}
      sidebar={{ banner: sidebarControls }}
      tabs={false}
      {...base}
    >
      {children}
    </DocsLayout>
  );
}
