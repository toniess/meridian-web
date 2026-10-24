/**
 * Фрагмент текста из поиска: совпадения бекенд обрамляет <mark></mark>.
 * Разбираем сами и выводим текстом, а не через innerHTML: в тексте книги
 * может оказаться что угодно.
 */
export default function Headline({ text }: { text: string }) {
  const parts = text.replace(/\s+/g, ' ').trim().split(/<mark>(.*?)<\/mark>/g);
  return (
    <span className="headline">
      {parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </span>
  );
}
