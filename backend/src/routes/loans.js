const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireLibrarianAuth } = require('../middleware/librarianAuth');

const router = express.Router();

const MAX_BORROW_LIMIT = 3;      // 学生最多借3本
const LOAN_DURATION_DAYS = 30;   // 借期30天

// 辅助函数：获取学生当前借阅数量（未归还）
async function getCurrentBorrowCount(userId) {
  return await prisma.loan.count({
    where: {
      userId,
      returnDate: null
    }
  });
}

// 辅助函数：检查学生是否有逾期未还的图书
async function hasOverdueLoans(userId) {
  const count = await prisma.loan.count({
    where: {
      userId,
      returnDate: null,
      dueDate: { lt: new Date() }
    }
  });
  return count > 0;
}

// 1. 搜索学生（馆员/管理员专用）
router.get('/users/search', requireLibrarianAuth, async (req, res, next) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { studentId: { contains: keyword } },
          { email: { contains: keyword.toLowerCase() } }
        ],
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        role: true
      },
      take: 20
    });

    // 附加当前借阅数量和逾期状态
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const currentCount = await getCurrentBorrowCount(user.id);
      const hasOverdue = await hasOverdueLoans(user.id);
      return {
        ...user,
        currentBorrowCount: currentCount,
        hasOverdue,
        canBorrow: (currentCount < MAX_BORROW_LIMIT) && !hasOverdue
      };
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    next(error);
  }
});

// 2. 搜索图书（馆员/管理员专用）
router.get('/books/search', requireLibrarianAuth, async (req, res, next) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { isbn: { contains: keyword } }
        ]
      },
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        availableCopies: true,
        totalCopies: true
      },
      take: 20
    });

    res.json({ books });
  } catch (error) {
    next(error);
  }
});

// 3. 馆员借出图书给学生
router.post('/lend', requireLibrarianAuth, async (req, res, next) => {
  try {
    const { userId, bookId } = req.body;
    if (!userId || !bookId) {
      return res.status(400).json({ message: 'userId and bookId are required' });
    }

    // 查询学生
    const student = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // 查询图书
    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) }
    });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No available copies of this book' });
    }

    // 检查是否重复借阅同一本未还
    const existingLoan = await prisma.loan.findFirst({
      where: {
        userId: student.id,
        bookId: book.id,
        returnDate: null
      }
    });
    if (existingLoan) {
      return res.status(400).json({ message: 'Student already borrowed this book and not returned' });
    }

    // 检查学生资格：借阅数量限制
    const currentCount = await getCurrentBorrowCount(student.id);
    if (currentCount >= MAX_BORROW_LIMIT) {
      return res.status(400).json({ message: `Student has already borrowed ${MAX_BORROW_LIMIT} books. Cannot lend more.` });
    }
    // 检查逾期
    const hasOverdue = await hasOverdueLoans(student.id);
    if (hasOverdue) {
      return res.status(400).json({ message: 'Student has overdue books. Please return them first.' });
    }

    // 创建借阅记录
    const checkoutDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS);

    const loan = await prisma.loan.create({
      data: {
        userId: student.id,
        bookId: book.id,
        checkoutDate,
        dueDate,
        fineAmount: 0,
        finePaid: false,
        fineForgiven: false
      }
    });

    // 减少图书可借副本数
    await prisma.book.update({
      where: { id: book.id },
      data: { availableCopies: { decrement: 1 } }
    });

    // 审计日志
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'LEND_BOOK',
        entity: 'Loan',
        entityId: loan.id,
        detail: `Librarian ${req.librarian.employeeId} lent "${book.title}" to student ${student.email}. Due date: ${dueDate.toISOString()}`
      }
    });

    res.status(201).json({
      message: 'Book lent successfully',
      loan: {
        id: loan.id,
        bookTitle: book.title,
        studentName: student.name,
        checkoutDate,
        dueDate
      }
    });
  } catch (error) {
    next(error);
  }
});





// 4. 管理员获取当前正在借阅的记录
router.get('/records', requireLibrarianAuth, async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { returnDate: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            studentId: true,
            email: true,
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
          }
        }
      },
      orderBy: { checkoutDate: 'desc' }
    });

    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

// 5. 管理员处理还书
router.post('/return', requireLibrarianAuth, async (req, res, next) => {
  try {
    const { loanId } = req.body;
    if (!loanId) {
      return res.status(400).json({ message: 'loanId is required' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        book: true,
        user: true,
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found' });
    }
    if (loan.returnDate) {
      return res.status(400).json({ message: 'This loan has already been returned' });
    }

    const returnDate = new Date();

    await prisma.loan.update({
      where: { id: loan.id },
      data: { returnDate }
    });

    await prisma.book.update({
      where: { id: loan.bookId },
      data: { availableCopies: { increment: 1 } }
    });

    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'RETURN_BOOK',
        entity: 'Loan',
        entityId: loan.id,
        detail: `Librarian ${req.librarian.employeeId} processed return for loan ${loan.id}. Book: ${loan.book.title}. Student: ${loan.user.email}`
      }
    });

    res.json({
      message: 'Book return processed successfully',
      returnDate
    });
  } catch (error) {
    next(error);
  }
});

// 6. 获取当前登录用户的个人借阅历史
router.get('/my-history', requireAuth, async (req, res, next) => {
  try {
    // 从 requireAuth 中间件获取当前用户的 ID
    const userId = req.user.id;

    const history = await prisma.loan.findMany({
      where: {
        userId: userId,
      },
      include: {
        book: {
          select: {
            title: true,
            author: true,
            isbn: true,
            genre: true,
          },
        },
      },
      orderBy: {
        checkoutDate: 'desc', // 按借出时间降序排列
      },
    });

    // 处理一下数据，增加一个状态字段方便前端显示
    const processedHistory = history.map(loan => {
      let status = 'ON_LOAN'; // 借阅中
      if (loan.returnDate) {
        status = 'RETURNED'; // 已归还
      } else if (new Date(loan.dueDate) < new Date()) {
        status = 'OVERDUE'; // 已逾期
      }

      return {
        ...loan,
        status
      };
    });

    res.json(processedHistory);
  } catch (error) {
    next(error);
  }
});
// 读者借阅图书
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: '只有学生可以借书' });
    }

    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ message: '请提供图书ID' });
    }

    // 检查图书是否存在且可借
    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) }
    });
    if (!book) {
      return res.status(404).json({ message: '图书不存在' });
    }
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: '该书已无剩余副本' });
    }

    // 检查是否已借阅未还
    const existingLoan = await prisma.loan.findFirst({
      where: {
        userId: req.user.id,
        bookId: parseInt(bookId),
        returnDate: null
      }
    });
    if (existingLoan) {
      return res.status(400).json({ message: '您已借阅该书，请先归还' });
    }

    // 检查借阅数量限制
    const currentCount = await prisma.loan.count({
      where: { userId: req.user.id, returnDate: null }
    });
    if (currentCount >= 3) {
      return res.status(400).json({ message: '最多同时借阅3本书' });
    }

    // 创建借阅记录
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const loan = await prisma.loan.create({
      data: {
        userId: req.user.id,
        bookId: parseInt(bookId),
        checkoutDate: new Date(),
        dueDate: dueDate,
        fineAmount: 0,
        finePaid: false,
        fineForgiven: false
      }
    });

    // 减少可借副本数
    await prisma.book.update({
      where: { id: parseInt(bookId) },
      data: { availableCopies: { decrement: 1 } }
    });

    res.json({ message: '借阅成功', loan });
  } catch (error) {
    next(error);
  }
});

// 还书功能
router.post('/return', requireAuth, async (req, res, next) => {
  try {
    const { loanId } = req.body;
    
    if (!loanId) {
      return res.status(400).json({ message: '请提供借阅记录ID (loanId)' });
    }

    // 1. 查找借阅记录
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: { book: true, user: true }
    });

    if (!loan) {
      return res.status(404).json({ message: '借阅记录不存在' });
    }

    // 2. 检查是否已经还过
    if (loan.returnDate !== null) {
      return res.status(400).json({ message: '这本书已经还过了' });
    }

    // 3. 计算是否逾期及罚款
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    let fineAmount = 0;
    
    if (today > dueDate) {
      // 计算逾期天数
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      // 假设每天罚款 0.5 元（可以根据需要调整）
      const DAILY_FINE = 0.5;
      fineAmount = daysOverdue * DAILY_FINE;
    }

    // 4. 更新借阅记录（设置还书日期和罚款金额）
    const updatedLoan = await prisma.loan.update({
      where: { id: parseInt(loanId) },
      data: {
        returnDate: today,
        fineAmount: fineAmount,
        finePaid: false,  // 未支付，需要用户支付
      }
    });

    // 5. 增加图书的可借数量
    await prisma.book.update({
      where: { id: loan.bookId },
      data: { availableCopies: { increment: 1 } }
    });

    // 6. 记录审计日志
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RETURN_BOOK',
        entity: 'Loan',
        entityId: loan.id,
        detail: `用户 ${req.user.email} 归还了图书 "${loan.book.title}"，逾期罚款: ${fineAmount}元`
      }
    });

    // 7. 返回结果
    res.json({
      message: '还书成功',
      loan: {
        id: updatedLoan.id,
        bookTitle: loan.book.title,
        userName: loan.user.name,
        checkoutDate: loan.checkoutDate,
        dueDate: loan.dueDate,
        returnDate: updatedLoan.returnDate,
        fineAmount: updatedLoan.fineAmount,
        isOverdue: fineAmount > 0
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;