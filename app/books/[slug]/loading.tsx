/**
 * Скелет страницы книги. Next показывает его сразу после клика, пока
 * грузится текст: без него читатель пару секунд смотрит на прежнюю
 * страницу и не понимает, сработало ли нажатие.
 */
export default function BookLoading() {
  return (
    <div aria-busy="true" aria-label="Книга загружается">
      <section className="wrap">
        <div className="book-hero">
          <div><div className="cover skel" /></div>
          <div>
            <div className="skel skel-line" style={{ width: '62%', height: '2.6rem', marginTop: 6 }} />
            <div className="skel skel-line" style={{ width: '22%', height: '.9rem', marginTop: 18 }} />
            <div className="skel skel-line" style={{ width: '48%', marginTop: 30 }} />
          </div>
        </div>
      </section>

      <div className="reader">
        <div className="wrap">
          <div className="page">
            {[94, 100, 97, 88, 100, 72, 0, 96, 100, 91, 60].map((w, i) =>
              w ? (
                <div key={i} className="skel skel-line" style={{ width: `${w}%` }} />
              ) : (
                <div key={i} style={{ height: '1.4em' }} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
