# Announcements

The strip at the top of every page of developers.cookieyes.com. It shows one announcement at a
time, and it only works if it stays rare: a strip that is always there stops being read.

## What qualifies

| Yes | No |
|---|---|
| A new minor or major version | Patch releases |
| A significant new feature | Bug fixes |
| A breaking change or a deprecation, however small | Documentation edits |
| An event: a workshop, a talk | Internal changes |

Breaking changes and deprecations always qualify: they are what people most need to hear about.

## How often

At most one new announcement every two weeks. Breaking changes and deprecations are the only
exception.

## Publish one

Edit [`content/announcement.json`](./content/announcement.json), open a pull request, check the
strip on the preview deployment, then merge. It goes live with the next deployment of the site.

```json
{
  "id": "react-0.11.0",
  "kind": "release",
  "message": "Provable consent records and per-module imports.",
  "linkText": "Read the release notes",
  "href": "/docs/changelog/2026-09-30",
  "published": "2026-10-06"
}
```

| Field | What it is |
|---|---|
| `id` | Names this announcement. Dismissing it remembers this id only, so a new id shows to everyone again. Letters, digits, `.`, `-`, `_`. |
| `kind` | The look. `release`: a minor version or a significant feature. `breaking`: a major version, a breaking change or a deprecation; the loud look. `event`: news that is not a release; no version shown. |
| `message` | What is new, in one sentence. At most 60 characters. |
| `linkText` | Where the link goes. At most 24 characters. |
| `href` | A page on this site, such as `/docs/changelog/2026-09-30`, or an `https://` address. |
| `published` | Today, as `YYYY-MM-DD`. |
| `expires` | Optional. The first day it no longer shows (UTC). Defaults to 30 days after `published`. |

`release` and `breaking` show the `@cookieyes/react` version from `sdk/react/package.json`, the
same number as the pill on the homepage. It is never typed here.

## Write it well

- Name what shipped and what it does: "Provable consent records and per-module imports." Not
  "Big news!".
- Say where the link goes: "Read the release notes", "Read the migration guide", "Reserve a seat".
  Never "Learn more".
- Link to a page that will not move. A release's own changelog page (`/docs/changelog/<date>`)
  stays; a heading inside a long page may not. The homepage is refused.
- No em dashes. Use a colon or a comma.

The build fails, and names the problem, when the kind is unknown, a text is too long, a date is
wrong, or `href` is a site page that does not exist. An `https://` link cannot be checked by the
build: open it yourself before merging.

On phones the version sits on its own row, with the message and the link below it. A long
message can take three lines on a small phone; check the preview at 360px wide, and shorten it
if that matters for this one.

## Change or remove one

- **Fix a typo:** change the text, keep the `id`. People who dismissed it do not see it again.
- **Announce again on purpose:** give it a new `id`.
- **Take it down now:** set the whole file to `null`, and merge.
- **Let it expire:** nothing to do. After `expires` it is hidden for everyone, with no deploy.
  A page that is already open keeps it until it is reloaded. The expired entry can stay in the
  file until the next announcement replaces it.

## How visitors see it

- A first-time visitor sees the consent banner first. The strip waits, and appears from their next
  page load after they make a choice.
- Opening the linked page counts as dismissing it.
- On phones the strip scrolls away with the page instead of staying at the top.
