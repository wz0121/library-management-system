import { useState } from 'react';

function BookSearch() {
  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const token = localStorage.getItem('token');

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    setMessage('');

    try {
      const params = new URLSearchParams();
      if (searchTitle) params.append('title', searchTitle);
      if (searchAuthor) params.append('author', searchAuthor);
      if (searchKeyword) params.append('keyword', searchKeyword);

      const response = await fetch(`http://localhost:3001/books/search?${params}`);
      const result = await response.json();

      if (result.success) {
        setBooks(result.data);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (bookId) => {
    if (!token) {
      setMessage('Please login first');
      return;
    }

    setMessage('');
    try {
      const response = await fetch('http://localhost:3001/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Borrow success!');
        handleSearch();
      } else {
        setMessage(data.message || 'Borrow failed');
      }
    } catch (error) {
      setMessage('Borrow failed: ' + error.message);
    }
  };

  const handleViewDetails = async (bookId) => {
    setDetailLoading(true);
    setDetailError('');

    try {
      const response = await fetch(`http://localhost:3001/books/${bookId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load book detail');
      }

      setSelectedBook(result.data);
    } catch (error) {
      setDetailError(error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedBook(null);
    setDetailError('');
  };

  const handleReset = () => {
    setSearchTitle('');
    setSearchAuthor('');
    setSearchKeyword('');
    setBooks([]);
    setSearched(false);
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Book Search</h1>
        <a href="/announcements" style={{ padding: '8px 16px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>公告</a>
      </div>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da', color: message.includes('success') ? '#155724' : '#721c24', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '80px', fontWeight: 'bold' }}>Title:</label>
          <input type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder="Enter book title" style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '80px', fontWeight: 'bold' }}>Author:</label>
          <input type="text" value={searchAuthor} onChange={(e) => setSearchAuthor(e.target.value)} placeholder="Enter author name" style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '80px', fontWeight: 'bold' }}>Keyword:</label>
          <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Enter keyword" style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={handleSearch} disabled={loading} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button onClick={handleReset} style={{ padding: '10px 24px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reset</button>
        </div>
      </div>

      {searched && (
        <>
          <h2>Results ({books.length})</h2>
          {books.length === 0 ? (
            <p>No books found</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {books.map((book) => (
                <div key={book.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: 'white' }}>
                  <h3 style={{ marginTop: 0, color: '#007bff' }}>{book.title}</h3>
                  <p><strong>Author:</strong> {book.author}</p>
                  <p><strong>ISBN:</strong> {book.isbn}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      onClick={() => handleViewDetails(book.id)}
                      style={{ padding: '6px 12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      查看详情
                    </button>
                  </div>
                  {book.available && book.availableCopies > 0 && (
                    <button onClick={() => handleBorrow(book.id)} style={{ marginTop: '10px', padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Borrow
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedBook && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeDetails}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, color: '#111827' }}>{selectedBook.title}</h2>
                <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Book ID: {selectedBook.id}</p>
              </div>
              <button
                onClick={closeDetails}
                style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            {detailLoading && <p style={{ marginTop: '20px' }}>Loading details...</p>}
            {detailError && <p style={{ marginTop: '20px', color: '#dc2626' }}>{detailError}</p>}

            {!detailLoading && !detailError && (
              <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
                <p><strong>Author:</strong> {selectedBook.author}</p>
                <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                <p><strong>Genre:</strong> {selectedBook.genre}</p>
                <p><strong>Legacy Location:</strong> {selectedBook.shelfLocation || 'N/A'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span style={{ color: selectedBook.available && selectedBook.availableCopies > 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                    {selectedBook.available && selectedBook.availableCopies > 0 ? 'Available' : 'Borrowed'}
                  </span>
                </p>
                <p><strong>Stock:</strong> {selectedBook.availableCopies || 0} / {selectedBook.totalCopies || 1}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookSearch;