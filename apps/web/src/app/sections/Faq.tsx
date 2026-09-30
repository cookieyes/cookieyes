// Not in the design file: added for search (the "People also ask" questions on the
// react cookie consent results page) and for AI answer engines, which lift Q&A as is.
// Kept to four questions on purpose. The same list feeds the FAQPage structured data on
// the homepage, so the visible answers and the structured ones can never drift apart.
import { BANNER_SIZE } from "@/lib/bundle-size";

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Do I need a cookie banner in my React app?",
    answer:
      "If your app sets non-essential cookies or loads tools such as analytics, ads or session replay for visitors covered by GDPR (the EU and UK) or CCPA (California), you need their consent first, or a way to opt out under CCPA. This SDK shows the right banner for each regulation and holds those tools back until the visitor agrees. Check your own obligations with your legal team.",
  },
  {
    question: "Does it work with the Next.js App Router?",
    answer:
      "Yes. @cookieyes/nextjs supports the App Router and the Pages Router on Next.js 14 and later. The banner is rendered on the server, and a returning visitor's saved choice is read from the request, so they never see the banner flash in and out.",
  },
  {
    question: "Is it free and MIT licensed?",
    answer:
      "Yes. The SDK is open source under the MIT licence, on GitHub. It runs entirely in your frontend: there is no account to create and no dashboard to set up.",
  },
  {
    question: "How big is the bundle?",
    answer: `The whole banner is ${BANNER_SIZE} gzipped, measured against an empty Next.js app. The headless core, and every script integration and translation, are separate imports, so you only ship what you use.`,
  },
];

export function Faq() {
  return (
    <section className="cy-faq" data-screen-label="FAQ" aria-labelledby="cy-faq-title">
      <div className="cy-faq-inner">
        <h2 id="cy-faq-title" className="cy-faq-title">
          Frequently asked questions
        </h2>
        <div className="cy-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="cy-faq-item">
              <summary className="cy-faq-q">
                {item.question}
                <svg
                  className="cy-faq-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="cy-faq-a">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
