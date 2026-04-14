const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// 获取所有图书
router.get('/', async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        author: true,
        available: true,
        shelfLocation: true,
      },
    });

    res.json({ data: books });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch books',
      detail: error.message,
    });
  }
});

// 图书搜索功能 - 按书名、作者、关键词查找
router.get('/search', async (req, res) => {
  try {
    const { title, author, keyword } = req.query;
    
    // 构建搜索条件
    const whereCondition = {};
    
    if (title || author || keyword) {
      whereCondition.OR = [];
      
      if (title) {
        whereCondition.OR.push({ title: { contains: title } });
      }
      
      if (author) {
        whereCondition.OR.push({ author: { contains: author } });
      }
      
      if (keyword) {
        whereCondition.OR.push(
          { title: { contains: keyword } },
          { author: { contains: keyword } }
        );
      }
    }
    
    const books = await prisma.book.findMany({
      where: whereCondition,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        genre: true,
        description: true,
        language: true,
        shelfLocation: true,
        available: true,
        availableCopies: true,
      },
    });
    
    res.json({ 
      success: true, 
      data: books,
      count: books.length 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search books',
      detail: error.message,
    });
  }
});

// 获取单本图书详情
router.get('/:id', async (req, res) => {
  const bookId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(bookId)) {
    return res.status(400).json({ error: 'Invalid book id' });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        genre: true,
        description: true,
        language: true,
        shelfLocation: true,
        available: true,
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch book detail',
      detail: error.message,
    });
  }
});

module.exports = router;