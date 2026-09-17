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
  return (
    <>
      {paras.map((p, i) => {
        if (p.type === 'h') return <h2 key={i}>{p.text}</h2>;
        if (p.type === 'quote') return <blockquote key={i}>{linkify(p.text, `q${i}`)}</blockquote>;
        return <p key={i}>{linkify(p.text, `p${i}`)}</p>;
      })}
    </>
  );
}
