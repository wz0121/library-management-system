import { useState, useEffect } from 'react';

function BookManagement({ onBack }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    description: '',
    language: 'English',
    totalCopies: 1
  });

  const token = localStorage.getItem('librarianToken');

  const fetchBooks = async () => {
    try {
      const response = await fetch('http://localhost:3001/books');
      const data = await response.json();
      setBooks(data.data || []);
    } catch (error) {
      setMessage('获取图书列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const url = editingBook 
        ? `http://localhost:3001/books/${editingBook.id}`
        : 'http://localhost:3001/books';
      const method = editingBook ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(editingBook ? '图书更新成功' : '图书添加成功');
        setShowForm(false);
        setEditingBook(null);
        setFormData({ title: '', author: '', isbn: '', genre: '', description: '', language: 'English', totalCopies: 1 });
        fetchBooks();
      } else {
        setMessage(data.error || '操作失败');
      }
    } catch (error) {
      setMessage('操作失败');
    }
  };

  const handleDelete = async (bookId, bookTitle) => {
    if (!confirm(`确定要删除图书《${bookTitle}》吗？`)) return;

    try {
      const response = await fetch(`http://localhost:3001/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessage('删除成功');
        fetchBooks();
      } else {
        setMessage('删除失败');
      }
    } catch (error) {
      setMessage('删除失败');
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      description: book.description || '',
      language: book.language || 'English',
      totalCopies: book.totalCopies || 1
    });
    setShowForm(true);
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={onBack} style={{ marginRight: '10px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ← 返回
          </button>
          <h1 style={{ display: 'inline-block', marginLeft: '10px' }}>图书管理</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditingBook(null); setFormData({ title: '', author: '', isbn: '', genre: '', description: '', language: 'English', totalCopies: 1 }); }} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          + 添加图书
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('成功') ? '#d4edda' : '#f8d7da', color: message.includes('成功') ? '#155724' : '#721c24', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
          <h2>{editingBook ? '编辑图书' : '添加图书'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input name="title" placeholder="书名" value={formData.title} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input name="author" placeholder="作者" value={formData.author} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input name="isbn" placeholder="ISBN" value={formData.isbn} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input name="genre" placeholder="分类" value={formData.genre} onChange={handleChange} required style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input name="language" placeholder="语言" value={formData.language} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <input name="totalCopies" type="number" placeholder="总副本数" value={formData.totalCopies} onChange={handleChange} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <textarea name="description" placeholder="简介" value={formData.description} onChange={handleChange} rows="3" style={{ gridColumn: '1/-1', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingBook(null); }} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>取消</button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f3f4f6' }}>
          <tr>
            <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>书名</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>作者</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>ISBN</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>分类</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>库存</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {books.map(book => (
            <tr key={book.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>{book.id}</td>
              <td style={{ padding: '12px' }}>{book.title}</td>
              <td style={{ padding: '12px' }}>{book.author}</td>
              <td style={{ padding: '12px' }}>{book.isbn}</td>
              <td style={{ padding: '12px' }}>{book.genre}</td>
              <td style={{ padding: '12px' }}>{book.availableCopies || 0}/{book.totalCopies || 1}</td>
              <td style={{ padding: '12px' }}>
                <button onClick={() => handleEdit(book)} style={{ marginRight: '8px', padding: '4px 8px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>编辑</button>
                <button onClick={() => handleDelete(book.id, book.title)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookManagement;