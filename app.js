console.log('hi');

const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

dotenv.config({ path: './config.env' }); // Load environment variables

app.use(bodyParser.json());
app.use(express.json());

const port = process.env.PORT || 3000;

require('./db/conn'); // Connect to the database
const user = require('./model/userSchema');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH']
}));

app.use(cookieParser());

app.use(require('./router/auth')); // Main Router

app.listen(port, () => {
    console.log(`✅ Server is listening on http://localhost:${port}`);
});
