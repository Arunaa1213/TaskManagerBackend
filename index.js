import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import User from './models/User.js';
import Task from './models/Card.js';
// import UserModel from './models/User.js';
// import CardModel from './models/Card.js'; 
import passport from 'passport';
import './passport.js'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { OAuth2Client } from 'google-auth-library';
import { body, validationResult } from 'express-validator';

const client = new OAuth2Client('361276648975-ca1oigh3okoopasmt9bu9jtdrrreqt2n.apps.googleusercontent.com');
const salt = bcrypt.genSaltSync(10);
const secret = 'qwerfcbvhnjklpwsdfxcvghu';

const app = express();
app.use(cors({ 
    credentials: true, 
    origin: process.env.API_URL,
    methods: 'GET,POST,PUT,DELETE',
}));
app.use(express.json());
app.use(cookieParser());
app.use(cookieSession({ 
    name: 'google-auth-session', 
    keys: ['key1', 'key2'] 
})); 
app.use(passport.initialize()); 
app.use(passport.session()); 

mongoose.connect('mongodb://arunaasureshkumar:l0nKbLbF1L0HvA6o@ac-jizlebv-shard-00-00.fjd4cfm.mongodb.net:27017,ac-jizlebv-shard-00-01.fjd4cfm.mongodb.net:27017,ac-jizlebv-shard-00-02.fjd4cfm.mongodb.net:27017/?replicaSet=atlas-omwi2v-shard-0&ssl=true&authSource=admin', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Middleware for validation errors
const validateErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

app.post('/register', 
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('firstname').notEmpty().withMessage('First name is required'),
    body('lastname').notEmpty().withMessage('Last name is required'),
    validateErrors,
    async (req, res) => {
        const { email, password, firstname, lastname } = req.body;
        try {
            const userDoc = await User.create({
                email, 
                password: bcrypt.hashSync(password, salt),
                firstname,
                lastname
            });
            res.json(userDoc);
        } catch (error) {
            res.status(500).json({ message: 'Error registering user', error });
        }
    }
);

app.post('/login', 
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validateErrors,
    async (req, res) => {
        const { email, password } = req.body;
        try {
            const userDoc = await User.findOne({ email });
            if (!userDoc) {
                return res.status(400).json('Wrong Credentials');
            }
            
            const passok = bcrypt.compareSync(password, userDoc.password);
            if (passok) {
                jwt.sign({ email, id: userDoc._id }, secret, {}, (err, token) => {
                    if (err) {
                        res.status(500).json('Error signing token');
                        return;
                    }
                    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax' }).json({
                        id: userDoc._id,
                        email,
                    });
                });
            } else {
                res.status(400).json('Wrong password Credentials');
            }
        } catch (error) {
            console.error('Error logging user:', error);
            res.status(500).json({ message: 'Error logging user', error });
        }
    }
);

app.post('/profile', (req, res) => {
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ error: 'Token must be provided' });
    }
    
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        res.json(info);
    });
});

app.post('/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, secure: false, sameSite: 'lax' }).json('ok');
});

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

app.get('/tasks', async (req, res) => {
    const { token } = req.cookies;
    try {
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            try {
                const tasks = await Task.find({ createdBy: info.id });
                res.status(200).json(tasks);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/updateTask', 
    body('taskId').isMongoId().withMessage('Invalid Task ID'),
    body('newCategory').notEmpty().withMessage('New category is required'),
    validateErrors,
    async (req, res) => {
        const { token } = req.cookies;
        const { taskId, newCategory } = req.body;

        try {
            jwt.verify(token, secret, {}, async (err, info) => {
                if (err) {
                    return res.status(403).json({ error: 'Invalid token' });
                }

                try {
                    const updatedTask = await Task.findByIdAndUpdate(
                        taskId,
                        { category: newCategory },
                        { new: true }
                    );
                    res.status(200).json(updatedTask);
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

app.put('/update/:id', 
    body('title').optional().notEmpty().withMessage('Title is required if provided'),
    body('description').optional().notEmpty().withMessage('Description is required if provided'),
    validateErrors,
    async (req, res) => {
        const { token } = req.cookies;
        const { title, description } = req.body;

        try {
            jwt.verify(token, secret, {}, async (err, info) => {
                if (err) {
                    return res.status(403).json({ error: 'Invalid token' });
                }

                try {
                    const updatedTask = await Task.findByIdAndUpdate(
                        req.params.id,
                        { title, description },
                        { new: true }
                    );
                    res.status(200).json(updatedTask);
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

app.delete('/delete/:id', async (req, res) => {
    const { token } = req.cookies;

    try {
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            try {
                await Task.findByIdAndDelete(req.params.id);
                res.status(200).json({ message: 'Task deleted successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/google-login', 
    body('tokenId').notEmpty().withMessage('Token ID is required'),
    validateErrors,
    async (req, res) => {
        const { tokenId } = req.body;
        try {
            const ticket = await client.verifyIdToken({
                idToken: tokenId,
                audience: '361276648975-ca1oigh3okoopasmt9bu9jtdrrreqt2n.apps.googleusercontent.com',
            });
            const { email, sub } = ticket.getPayload();

            let user = await User.findOne({ email });
            if (!user) {
                user = await User.create({
                    email,
                    password: bcrypt.hashSync(sub, salt),
                });
            }

            jwt.sign({ email, id: user._id }, secret, {}, (err, token) => {
                if (err) {
                    res.status(500).json('Error signing token');
                    return;
                }
                res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax' }).json({
                    id: user._id,
                    email,
                });
            });
        } catch (error) {
            console.error('Error during Google login', error);
            res.status(500).json({ message: 'Error during Google login', error });
        }
    }
);

app.listen(4000, () => {
    console.log('Server running');
});
