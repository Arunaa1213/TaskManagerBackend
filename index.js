const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Task = require('./models/Card');
const passport = require('passport');
require('./passport'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cookieSession = require('cookie-session');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('361276648975-ca1oigh3okoopasmt9bu9jtdrrreqt2n.apps.googleusercontent.com');

app.use(cors({ 
    credentials: true, 
    origin: 'http://localhost:3000',
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

const salt = bcrypt.genSaltSync(10);
const secret = 'qwerfcbvhnjklpwsdfxcvghu';

mongoose.connect('mongodb://arunaasureshkumar:l0nKbLbF1L0HvA6o@ac-jizlebv-shard-00-00.fjd4cfm.mongodb.net:27017,ac-jizlebv-shard-00-01.fjd4cfm.mongodb.net:27017,ac-jizlebv-shard-00-02.fjd4cfm.mongodb.net:27017/?replicaSet=atlas-omwi2v-shard-0&ssl=true&authSource=admin', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));


app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userDoc = await User.create({
            email, 
            password: bcrypt.hashSync(password, salt),
        });
        res.json(userDoc);
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userDoc = await User.findOne({ email });
        if (!userDoc) {
            console.log('EMAIL NOT FOUND');
            return res.status(400).json('Wrong Credentials');
        }
        
        const passok = bcrypt.compareSync(password, userDoc.password);
        console.log('passok', passok);
        if (passok) {
            console.log('inside passok');
            jwt.sign({ email, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) {
                    res.status(500).json('Error signing token');
                    return;
                }
                console.log('token', token);
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
});

app.post('/profile', (req, res) => {
    const { token } = req.cookies;
    console.log('Cookies:', req.cookies);
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

app.post('/create', async (req, res) => {
    const { token } = req.cookies;
    console.log("Token in create", token);

    try {
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            const { title, description, category, userId } = req.body;

            try {
                const postDoc = await Task.create({
                    title,
                    description,
                    category,
                    createdBy: info.id,
                });
                console.log('postDoc', postDoc);
                res.status(201).json(postDoc);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/tasks', async (req, res) => {
    const { token } = req.cookies;
    console.log("Token in fetch tasks", token);

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

app.post('/updateTask', async (req, res) => {
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
});

app.put('/update/:id', async (req, res) => {
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
});

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

app.post('/google-login', async (req, res) => {
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
                password: bcrypt.hashSync(sub, salt), // hash the Google user id as password or another placeholder
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
});

app.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});
