"use client";

import type { ConsentCategory } from "@cookieyes/core";
import type { IframeHTMLAttributes, ReactNode } from "react";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useConsentCategory } from "../hooks/useConsentCategory.js";

type Props = Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src"> & {
  src: string;
  category: ConsentCategory;
  placeholder?: ReactNode;
};

export function GatedFrame({ src, category, placeholder, ...rest }: Props) {
  const allowed = useConsentCategory(category);
  const { showPreferences } = useConsentActions();

  if (allowed) return <iframe src={src} {...rest} />;

  return (
    <div className="cy-frame-placeholder" data-cy-theme="system">
      {placeholder ?? (
        <>
          <p>
            This content requires <strong>{category}</strong> cookies to be enabled.
          </p>
          <button className="cy-btn cy-btn-primary" type="button" onClick={() => showPreferences()}>
            Manage Preferences
          </button>
        </>
      )}
    </div>
  );
}
