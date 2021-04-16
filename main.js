'use strict';

const cors = require('cors');
const express = require('express');

// Constants
// const PORT = 8899;
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();

app.use(cors());

app.use(express.static('./app/public'));
app.use(express.json());
// app.use(express.urlencoded());


app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
