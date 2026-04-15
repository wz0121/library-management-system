import { useState, useEffect } from 'react';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/readers/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      setMessage('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:3001/readers/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setMessage('角色更新成功');
        fetchUsers();
      } else {
        setMessage('更新失败');
      }
    } catch (error) {
      setMessage('更新失败');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'STUDENT': return '学生';
      case 'LIBRARIAN': return '馆员';
      case 'ADMIN': return '管理员';
      default: return role;
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>用户管理</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>管理系统用户和权限</p>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>姓名</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>邮箱</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>学号</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>角色</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{user.id}</td>
                <td style={{ padding: '12px' }}>{user.name}</td>
                <td style={{ padding: '12px' }}>{user.email}</td>
                <td style={{ padding: '12px' }}>{user.studentId || '-'}</td>
                <td style={{ padding: '12px' }}>{getRoleName(user.role)}</td>
                <td style={{ padding: '12px' }}>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="STUDENT">学生</option>
                    <option value="LIBRARIAN">馆员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;