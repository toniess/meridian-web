import type { Para } from '@/lib/types';

const URL_RE = /(https?:\/\/[^\s<>»"]+)/g;
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Превращает markdown-ссылки и голые адреса в кликабельные */
function linkify(text: string, key: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let i = 0;

  // сначала [текст](адрес)
  rest = rest.replace(MD_LINK_RE, (_, label: string, href: string) => `\u0000${label}\u0001${href}\u0000`);

  for (const chunk of rest.split('\u0000')) {
    if (chunk.includes('\u0001')) {
      const [label, href] = chunk.split('\u0001');
      nodes.push(
        <a className="inline" key={`${key}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      );
      continue;
    }
    const parts = chunk.split(URL_RE);
    for (const p of parts) {
      if (!p) continue;
      if (URL_RE.test(p)) {
        URL_RE.lastIndex = 0;
        nodes.push(
          <a className="inline" key={`${key}-u${i++}`} href={p} target="_blank" rel="noopener noreferrer">
            {p.replace(/^https?:\/\//, '')}
          </a>,
        );
      } else {
        nodes.push(<span key={`${key}-t${i++}`}>{p}</span>);
      }
      URL_RE.lastIndex = 0;
    }
  }
  return nodes;
}

export default function RichText({ paras }: { paras: Para[] }) {
  const out: React.ReactNode[] = [];
  let stanzas: React.ReactNode[] = [];

  // Идущие подряд строфы собираются в один блок. Центрировать каждую
  // по отдельности нельзя: у строф разной ширины разъедется левый край,
  // а в стихотворении он общий.
  const flushStanzas = () => {
    if (!stanzas.length) return;
    out.push(
      <div className="verses" key={`v${out.length}`}>
        {stanzas}
      </div>,
    );
    stanzas = [];
  };

  paras.forEach((p, i) => {
    // в строфе перенос строки — часть текста, поэтому строки отдельными узлами
    if (p.type === 'verse') {
      stanzas.push(
        <p className="verse" key={i}>
          {p.lines.map((line, j) => (
            <span key={j}>{linkify(line, `v${i}-${j}`)}</span>
          ))}
        </p>,
      );
      return;
    }

    flushStanzas();
    if (p.type === 'h') out.push(<h2 key={i}>{p.text}</h2>);
    else if (p.type === 'quote') out.push(<blockquote key={i}>{linkify(p.text, `q${i}`)}</blockquote>);
    else out.push(<p key={i}>{linkify(p.text, `p${i}`)}</p>);
  });
  flushStanzas();

  return <>{out}</>;
}
