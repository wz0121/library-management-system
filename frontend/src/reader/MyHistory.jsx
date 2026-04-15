import { useState, useEffect } from 'react';

function MyHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/reader/my-borrows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHistory(data.loans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (copyId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/reader/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ copyId: copyId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage('Renew success! New due date: ' + new Date(data.newDueDate).toLocaleDateString());
        fetchHistory();
      } else {
        setMessage(data.message || 'Renew failed');
      }
    } catch (error) {
      setMessage('Renew failed');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReturn = async (loanId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3001/api/reader/return/${loanId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Return success!');
        fetchHistory();
      } else {
        setMessage(data.message || 'Return failed');
      }
    } catch (error) {
      setMessage('Return failed');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const getStatusText = (loan) => {
    if (loan.returnDate) return 'Returned';
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return 'Overdue';
    return 'On Loan';
  };

  const getStatusColor = (loan) => {
    if (loan.returnDate) return '#10b981';
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return '#ef4444';
    return '#3b82f6';
  };

  const canRenew = (loan) => {
    if (loan.returnDate) return false;
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return false;
    return (loan.renewCount || 0) < 2;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2>My Borrow History</h2>
      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
          {message}
        </div>
      )}
      {history.length === 0 ? (
        <p>No records</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th>Title</th><th>Author</th><th>Borrow Date</th><th>Due Date</th><th>Return Date</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.copy?.book?.title || 'Unknown'}</td>
                <td>{loan.copy?.book?.author || 'Unknown'}</td>
                <td>{new Date(loan.checkoutDate).toLocaleDateString()}</td>
                <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                <td>{loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : '-'}</td>
                <td>
                  <span style={{ backgroundColor: getStatusColor(loan), color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                    {getStatusText(loan)}
                  </span>
                </td>
                <td>
                  {!loan.returnDate && (
                    <>
                      {canRenew(loan) && (
                        <button onClick={() => handleRenew(loan.copyId)} style={{ marginRight: '8px', padding: '4px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Renew
                        </button>
                      )}
                      <button onClick={() => handleReturn(loan.id)} style={{ padding: '4px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Return
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyHistory;