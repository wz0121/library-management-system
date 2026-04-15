const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const MAX_BORROW_LIMIT = 5;
const MAX_RENEW_COUNT = 2;
const RENEW_DAYS = 14;

// 获取我的借阅
router.get('/my-borrows', requireAuth, async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user.id, returnDate: null },
      include: { book: true },
      orderBy: { dueDate: 'asc' }
    });
    res.json({ loans });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch' });
  }
});

// 借阅图书
router.post('/borrow/:bookId', requireAuth, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId);
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return res.status(404).json({ message: 'Book not found' });

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No available copies' });
    }

    const currentCount = await prisma.loan.count({
      where: { userId: req.user.id, returnDate: null }
    });
    if (currentCount >= MAX_BORROW_LIMIT) {
      return res.status(400).json({ message: `Max borrow limit is ${MAX_BORROW_LIMIT}` });
    }

    const existing = await prisma.loan.findFirst({
      where: { userId: req.user.id, bookId, returnDate: null }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already borrowed this book' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const loan = await prisma.loan.create({
      data: { userId: req.user.id, bookId, dueDate, renewCount: 0 }
    });

    await prisma.book.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: 1 } }
    });

    res.json({ message: 'Borrow success', loan });
  } catch (error) {
    res.status(500).json({ message: 'Borrow failed' });
  }
});

// 续借
router.post('/renew', requireAuth, async (req, res) => {
  try {
    const { loanIds } = req.body;
    const results = [];

    for (const loanId of loanIds) {
      const loan = await prisma.loan.findFirst({
        where: { id: loanId, userId: req.user.id, returnDate: null }
      });

      if (!loan) {
        results.push({ loanId, success: false, message: 'Loan not found' });
        continue;
      }

      if (loan.renewCount >= MAX_RENEW_COUNT) {
        results.push({ loanId, success: false, message: 'Max renew limit reached' });
        continue;
      }

      const newDueDate = new Date(loan.dueDate);
      newDueDate.setDate(newDueDate.getDate() + RENEW_DAYS);

      await prisma.loan.update({
        where: { id: loanId },
        data: { dueDate: newDueDate, renewCount: loan.renewCount + 1 }
      });

      results.push({ loanId, success: true, newDueDate });
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Renew failed' });
  }
});

module.exports = router;