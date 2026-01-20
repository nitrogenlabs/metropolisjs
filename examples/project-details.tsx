/**
 * Project details UX for books/chapters/outlines using MetropolisJS.
 * Shows how to list project outline, books, and chapters, and add/edit items.
 */
import {useEffect, useMemo, useState} from 'react';
import {Metropolis, useMetropolis} from '../src/index.js';

import type {FC} from 'react';
import type {PostType} from '../src/adapters/postAdapter/postAdapter.js';

type ChapterMap = Record<string, PostType[]>;

const ProjectShell: FC<{projectId: string}> = ({projectId}) => (
  <Metropolis
    config={{
      development: {
        environment: 'development',
        app: {
          api: {
            url: 'http://localhost:3000/app',
            public: 'http://localhost:3000/public'
          }
        }
      }
    }}
  >
    <ProjectDetails projectId={projectId} />
  </Metropolis>
);

const ProjectDetails: FC<{projectId: string}> = ({projectId}) => {
  const {postActions} = useMetropolis(['post']);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<PostType[]>([]);
  const [chapters, setChapters] = useState<ChapterMap>({});
  const [outline, setOutline] = useState<PostType[]>([]);
  const [bookName, setBookName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number | undefined>();
  const [outlineText, setOutlineText] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>();

  const selectedBook = useMemo(
    () => books.find((book) => (book.bookId || book.postId) === selectedBookId),
    [books, selectedBookId]
  );

  const loadData = async () => {
    if(!projectId) {
      return;
    }
    setLoading(true);
    try {
      const [projectOutline, projectBooks] = await Promise.all([
        postActions.getProjectOutline(projectId, 0, 100, ['content', 'postId']),
        postActions.getBooksByProject(projectId, 0, 100, ['bookId', 'bookName', 'postId', 'name'])
      ]);
      setOutline(projectOutline || []);
      setBooks(projectBooks || []);
      const chapterLists = await Promise.all(
        (projectBooks || []).map((book) =>
          postActions.getChaptersByBook(book.bookId || book.postId!, 0, 200, ['chapterNumber', 'name', 'postId'])
        )
      );
      const chapterMap: ChapterMap = {};
      projectBooks.forEach((book, index) => {
        const bookId = book.bookId || book.postId || '';
        chapterMap[bookId] = chapterLists[index] || [];
      });
      setChapters(chapterMap);
      setSelectedBookId((current) => current || projectBooks[0]?.bookId || projectBooks[0]?.postId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddBook = async () => {
    if(!bookName.trim()) return;
    await postActions.addBook(projectId, {name: bookName, bookName});
    setBookName('');
    await loadData();
  };

  const handleAddChapter = async () => {
    if(!selectedBookId || !chapterName.trim()) return;
    await postActions.addChapter(selectedBookId, {name: chapterName, chapterNumber});
    setChapterName('');
    setChapterNumber(undefined);
    await loadData();
  };

  const handleAddOutline = async () => {
    if(!outlineText.trim()) return;
    await postActions.addProjectOutline(projectId, {content: outlineText});
    setOutlineText('');
    await loadData();
  };

  return (
    <div style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Project</p>
          <h1 style={styles.title}>Project Details</h1>
          <p style={styles.subtitle}>Books, chapters, and outlines managed through MetropolisJS.</p>
        </div>
        <div style={styles.status}>{loading ? 'Loading…' : 'Live'}</div>
      </header>

      <section style={styles.section}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Project Outline</h2>
            <button style={styles.buttonGhost} onClick={handleAddOutline}>Save outline</button>
          </div>
          <textarea
            style={styles.textarea}
            placeholder="Outline notes for the entire project…"
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
          />
          <ul style={styles.list}>
            {outline.map((item) => (
              <li key={item.postId} style={styles.listItem}>
                <div style={styles.listTitle}>{item.content || item.name}</div>
                <div style={styles.listMeta}>#{item.postId}</div>
              </li>
            ))}
            {!outline.length && <li style={styles.empty}>No outline yet.</li>}
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Add Book</h2>
          </div>
          <input
            style={styles.input}
            placeholder="Book title"
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
          />
          <button style={styles.buttonPrimary} onClick={handleAddBook}>Add book</button>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardWide}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Books</h2>
            <span style={styles.badge}>{books.length} total</span>
          </div>
          <div style={styles.columns}>
            <div style={styles.column}>
              <ul style={styles.list}>
                {books.map((book) => {
                  const id = book.bookId || book.postId || '';
                  const isActive = id === selectedBookId;
                  return (
                    <li
                      key={id}
                      style={{...styles.listItem, ...(isActive ? styles.activeItem : {})}}
                      onClick={() => setSelectedBookId(id)}
                    >
                      <div style={styles.listTitle}>{book.bookName || book.name}</div>
                      <div style={styles.listMeta}>Book #{id}</div>
                    </li>
                  );
                })}
                {!books.length && <li style={styles.empty}>No books yet.</li>}
              </ul>
            </div>
            <div style={styles.column}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.eyebrow}>Selected book</div>
                  <div style={styles.listTitle}>{selectedBook?.bookName || selectedBook?.name || 'Choose a book'}</div>
                </div>
                <div style={styles.badgeMuted}>{chapters[selectedBookId || '']?.length || 0} chapters</div>
              </div>
              <div style={styles.inlineForm}>
                <input
                  style={styles.input}
                  placeholder="Chapter title"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                />
                <input
                  style={styles.input}
                  placeholder="Chapter #"
                  value={chapterNumber ?? ''}
                  onChange={(e) => setChapterNumber(e.target.value ? Number(e.target.value) : undefined)}
                  type="number"
                  min={1}
                />
                <button style={styles.buttonPrimary} onClick={handleAddChapter} disabled={!selectedBookId}>
                  Add chapter
                </button>
              </div>
              <ul style={styles.list}>
                {(chapters[selectedBookId || ''] || []).map((chapter) => (
                  <li key={chapter.postId} style={styles.listItem}>
                    <div style={styles.listTitle}>
                      <span style={styles.badgeMuted}>#{chapter.chapterNumber || '?'}</span> {chapter.name}
                    </div>
                    <div style={styles.listMeta}>Chapter ID {chapter.postId}</div>
                  </li>
                ))}
                {selectedBookId && !(chapters[selectedBookId] || []).length && (
                  <li style={styles.empty}>No chapters for this book yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    background: 'linear-gradient(135deg, #0f172a 0%, #111827 60%, #0b1021 100%)',
    color: '#e5e7eb',
    minHeight: '100vh',
    padding: '32px',
    lineHeight: 1.6
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    margin: '4px 0 8px'
  },
  subtitle: {
    color: '#94a3b8',
    margin: 0
  },
  status: {
    padding: '8px 12px',
    background: '#22c55e',
    color: '#0f172a',
    borderRadius: '999px',
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  section: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: '2fr 1fr',
    marginBottom: '16px'
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '16px',
    backdropFilter: 'blur(4px)'
  },
  cardWide: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '16px',
    backdropFilter: 'blur(4px)',
    gridColumn: '1 / -1'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    letterSpacing: '0.01em'
  },
  buttonPrimary: {
    background: 'linear-gradient(120deg, #22d3ee, #2563eb)',
    color: '#0b1021',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  buttonGhost: {
    background: 'transparent',
    color: '#e5e7eb',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '8px 12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    marginBottom: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb'
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#e5e7eb'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  listItem: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer'
  },
  activeItem: {
    borderColor: '#22d3ee',
    boxShadow: '0 8px 24px rgba(34, 211, 238, 0.15)'
  },
  listTitle: {
    fontWeight: 700,
    marginBottom: 4
  },
  listMeta: {
    color: '#94a3b8',
    fontSize: '12px'
  },
  empty: {
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  badge: {
    background: '#22d3ee',
    color: '#0b1021',
    borderRadius: '999px',
    padding: '4px 10px',
    fontWeight: 700,
    fontSize: '12px'
  },
  badgeMuted: {
    background: 'rgba(255,255,255,0.08)',
    color: '#e5e7eb',
    borderRadius: '999px',
    padding: '4px 10px',
    fontWeight: 700,
    fontSize: '12px'
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  inlineForm: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr auto',
    gap: '8px',
    alignItems: 'center'
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  }
};

export default ProjectShell;
