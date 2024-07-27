import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { expect } from 'chai';
const Task = require('./models/Card');

const app = express();
const secret = 'qwerfcbvhnjklpwsdfxcvghu';

function validateErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

app.use(express.json());

app.post('/create',
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  validateErrors,
  async (req, res) => {
    const { token } = req.cookies;
    try {
      jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid token' });
        }
        const { title, description, category } = req.body;
        try {
          const postDoc = await Task.create({
            title,
            description,
            category,
            createdBy: info.id,
          });
          res.status(201).json(postDoc);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

describe('POST /create', () => {
  it('should return 400 if title is missing', async () => {
    const response = await request(app)
      .post('/create')
      .send({
        description: 'Test description',
        category: 'Test category'
      });
    expect(response.status).to.equal(400);
    expect(response.body.errors).to.deep.include({ msg: 'Title is required', param: 'title' });
  });

  it('should return 400 if description is missing', async () => {
    const response = await request(app)
      .post('/create')
      .send({
        title: 'Test title',
        category: 'Test category'
      });
    expect(response.status).to.equal(400);
    expect(response.body.errors).to.deep.include({ msg: 'Description is required', param: 'description' });
  });

  it('should return 400 if category is missing', async () => {
    const response = await request(app)
      .post('/create')
      .send({
        title: 'Test title',
        description: 'Test description'
      });
    expect(response.status).to.equal(400);
    expect(response.body.errors).to.deep.include({ msg: 'Category is required', param: 'category' });
  });

  it('should return 403 if token is invalid', async () => {
    const response = await request(app)
      .post('/create')
      .set('Cookie', ['token=invalidtoken'])
      .send({
        title: 'Test title',
        description: 'Test description',
        category: 'Test category'
      });
    expect(response.status).to.equal(403);
    expect(response.body.error).to.equal('Invalid token');
  });

  it('should return 201 and create a post if all fields are valid and token is valid', async () => {
    const validToken = jwt.sign({ id: 'userId' }, secret);
    const response = await request(app)
      .post('/create')
      .set('Cookie', [`token=${validToken}`])
      .send({
        title: 'Test title',
        description: 'Test description',
        category: 'Test category'
      });
    expect(response.status).to.equal(201);
    expect(response.body).to.be.an('object');
  });

  it('should return 500 if there is a server error', async () => {
    const originalCreate = Task.create;
    Task.create = () => Promise.reject(new Error('Server error'));

    const validToken = jwt.sign({ id: 'userId' }, secret);
    const response = await request(app)
      .post('/create')
      .set('Cookie', [`token=${validToken}`])
      .send({
        title: 'Test title',
        description: 'Test description',
        category: 'Test category'
      });

    Task.create = originalCreate;

    expect(response.status).to.equal(500);
    expect(response.body.error).to.equal('Server error');
  });
});

