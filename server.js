// server.js

const express = require('express');
const path = require('path');
const app = express();

// Порт, на котором будет работать сервер (используется переменная среды или 3000 по умолчанию)
const PORT = process.env.PORT || 3000;

// Указываем директорию для статических файлов (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для tonconnect-manifest.json
app.get('/tonconnect-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'tonconnect-manifest.json'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
