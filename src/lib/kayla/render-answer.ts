/**
 * Kayla's safe answer-presentation renderer.
 *
 * The frontend previously assigned `textEl.textContent = msg.text` — safe by
 * construction (never executes model output) but also literal: a canonical
 * bullet ("• CodeForge — ...") or a provider slip into markdown ("**bold**",
 * "### Heading", "> quoted") rendered as those exact characters inside a
 * `white-space: pre-wrap` blob instead of an actual list, emphasis, or clean
 * paragraph.
 *
 * This module recognizes a small, deliberately narrow set of shapes —
 * paragraphs, bullet/numbered lists, inline **bold** and `code` — and builds
 * them with `document.createElement` + `textContent` only. It is not a
 * markdown engine: anything outside this vocabulary (raw HTML, `>` blockquote
 * markers, `#` headings) is either stripped down to plain prose or left as
 * inert text, exactly as the flat textContent approach it replaces did. It
 * never parses or assigns HTML, so model-controlled text containing
 * `<script>`, `<img onerror>`, or any other markup renders as inert text.
 *
 * Quotation marks are deliberately never touched here — stripping a
 * whole-paragraph wrap would also strip a genuine quote a visitor asked for
 * verbatim, which no shape-only heuristic can tell apart from an ordinary
 * sentence a model habitually wrapped in quotes. That problem is solved at
 * the source (the system prompt), not by mangling rendered text.
 */

const BULLET_LINE = /^[•\-*]\s+(.*)$/;
const NUMBERED_LINE = /^\d+[.)]\s+(.*)$/;
const HEADING_MARKER = /^#{1,6}\s+(.*)$/;
const BLOCKQUOTE_MARKER = /^>\s?(.*)$/;

/** Strip a leading heading (`### `) or blockquote (`> `) marker, keeping the text. */
function stripLineMarkers(line: string): string {
  const heading = HEADING_MARKER.exec(line);
  if (heading) return heading[1];
  const quote = BLOCKQUOTE_MARKER.exec(line);
  if (quote) return quote[1];
  return line;
}

/** Append `**bold**` as `<strong>` and `` `code` `` as `<code>`; everything else is a plain text node. */
function appendInline(parent: HTMLElement, text: string): void {
  const pattern = /\*\*(.+?)\*\*|`([^`\n]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    if (match[1] !== undefined) {
      const strong = document.createElement('strong');
      strong.textContent = match[1];
      parent.appendChild(strong);
    } else if (match[2] !== undefined) {
      const code = document.createElement('code');
      code.className = 'kayla-inline-code';
      code.textContent = match[2];
      parent.appendChild(code);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function appendParagraph(container: HTMLElement, lines: string[]): void {
  const p = document.createElement('p');
  p.className = 'kayla-msg__p';
  lines.forEach((line, index) => {
    if (index > 0) p.appendChild(document.createElement('br'));
    appendInline(p, stripLineMarkers(line));
  });
  container.appendChild(p);
}

function appendList(container: HTMLElement, tag: 'ul' | 'ol', items: string[]): void {
  const list = document.createElement(tag);
  list.className = 'kayla-msg__list';
  for (const item of items) {
    const li = document.createElement('li');
    appendInline(li, stripLineMarkers(item));
    list.appendChild(li);
  }
  container.appendChild(list);
}

/**
 * Render one `\n\n`-delimited block. A block may itself mix a lead-in line
 * with an immediately-following list (no blank line between them, a common
 * shape from both canonical snippets and provider prose): each contiguous run
 * of list-marker lines becomes its own `<ul>`/`<ol>`, and each contiguous run
 * of ordinary lines becomes one `<p>` (joined with `<br>`, not merged into one
 * sentence).
 */
function appendBlock(container: HTMLElement, block: string): void {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
    if (BULLET_LINE.test(lines[i]) || NUMBERED_LINE.test(lines[i])) {
      const pattern = BULLET_LINE.test(lines[i]) ? BULLET_LINE : NUMBERED_LINE;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(pattern.exec(lines[i])![1]);
        i++;
      }
      appendList(container, pattern === NUMBERED_LINE ? 'ol' : 'ul', items);
    } else {
      const paragraphLines: string[] = [];
      while (i < lines.length && !BULLET_LINE.test(lines[i]) && !NUMBERED_LINE.test(lines[i])) {
        paragraphLines.push(lines[i]);
        i++;
      }
      appendParagraph(container, paragraphLines);
    }
  }
}

/**
 * Render Kayla's answer text into `container` as safe, structured DOM.
 * Clears any previously-rendered nodes first (removeChild, not innerHTML —
 * this module never assigns HTML, even to clear its own prior output).
 */
export function renderKaylaAnswer(container: HTMLElement, text: string): void {
  while (container.firstChild) container.removeChild(container.firstChild);

  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) {
    container.appendChild(document.createTextNode(text));
    return;
  }
  for (const block of blocks) appendBlock(container, block);
}
