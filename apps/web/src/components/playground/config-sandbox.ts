/**
 * Evaluates a config object literal without letting it near this origin.
 *
 * Reading edited code back needs a JS parser, and writing a tolerant one is a losing game —
 * a wording field holding `"We use cookies, and…"` already defeats anything regex-based,
 * and a hand-rolled reader still rejects things a developer may reasonably type. The engine
 * has a parser; the problem is only where to run it.
 *
 * So it runs in a hidden `<iframe sandbox="allow-scripts">`. Without `allow-same-origin`
 * the frame gets an opaque origin: it cannot read this site's cookies or storage, and its
 * messages arrive with `origin === "null"`. Its syntax errors are also better written than
 * anything we would author by hand ("Unexpected token ','").
 *
 * The code passed here must only ever come from the visitor's own typing. Prefilling the
 * editor from a URL or any third-party source would turn this from a sandbox into a
 * delivery mechanism.
 */

export type SandboxResult = { ok: true; value: unknown } | { ok: false; error: string };

type Reply = { id: number; ok: boolean; value?: unknown; error?: string };

// Evaluates one object literal per message. Values that cannot survive `postMessage` — a
// function, most obviously — are reported rather than thrown away silently.
const FRAME_SOURCE = `<script>
addEventListener("message", function (event) {
  var id = event.data && event.data.id;
  var reply;
  try {
    reply = { id: id, ok: true, value: Function("return (" + event.data.code + ")")() };
  } catch (error) {
    reply = { id: id, ok: false, error: String((error && error.message) || error) };
  }
  try {
    parent.postMessage(reply, "*");
  } catch (_) {
    parent.postMessage({ id: id, ok: false, error: "Config must be plain data — no functions." }, "*");
  }
});
</script>`;

export type ConfigSandbox = {
  evaluate: (code: string) => Promise<SandboxResult>;
  destroy: () => void;
};

export function createConfigSandbox(): ConfigSandbox {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Config reader";
  frame.style.display = "none";
  frame.srcdoc = FRAME_SOURCE;
  document.body.appendChild(frame);

  const loaded = new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
  });

  let lastId = 0;

  async function evaluate(code: string): Promise<SandboxResult> {
    await loaded;
    const target = frame.contentWindow;
    if (!target) return { ok: false, error: "The config reader is unavailable." };

    lastId += 1;
    const id = lastId;

    return new Promise<SandboxResult>((resolve) => {
      function onReply(event: MessageEvent) {
        // The frame is the only sender we accept from, and a stale reply from an earlier
        // keystroke must not overwrite a newer one.
        if (event.source !== target) return;
        const reply = event.data as Reply;
        if (reply?.id !== id) return;
        window.removeEventListener("message", onReply);
        resolve(
          reply.ok ? { ok: true, value: reply.value } : { ok: false, error: reply.error ?? "" },
        );
      }
      window.addEventListener("message", onReply);
      target.postMessage({ id, code }, "*");
    });
  }

  return { evaluate, destroy: () => frame.remove() };
}
