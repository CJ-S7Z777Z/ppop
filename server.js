// server.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TonWeb = require('tonweb');
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
const app = express();

// Порт сервера
const PORT = process.env.PORT || 3000;

// Статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для обработки JSON в запросах
app.use(bodyParser.json());

// Простейшая база данных в памяти (объект)
// В реальном приложении замените на настоящую базу данных
let userBalances = {};

// Адрес кошелька приложения
const appWalletAddress = 'UQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBVzah';

// Маршрут для tonconnect-manifest.json
app.get('/tonconnect-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'tonconnect-manifest.json'));
});

// Маршрут для получения баланса пользователя
app.post('/get-balance', async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.json({ success: false, message: 'Wallet address is required' });
  }

  try {
    // Получаем баланс пользователя из нашей "базы данных"
    const userBalance = userBalances[walletAddress] || 0;

    res.json({ success: true, balance: userBalance });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.json({ success: false, message: 'Error fetching balance' });
  }
});

// Функция для отслеживания транзакций на адрес приложения
async function monitorIncomingTransactions() {
  try {
    console.log('Starting to monitor incoming transactions...');

    // Получаем информацию о последнем обработанном блоке (храним в памяти)
    let lastTransactionLt = null;

    // Периодически опрашиваем блокчейн
    setInterval(async () => {
      try {
        // Получаем данные о кошельке приложения
        const transactions = await tonweb.provider.getTransactions(appWalletAddress, 30, lastTransactionLt);

        for (const tx of transactions) {
          // Если уже обработали эту транзакцию, пропускаем
          if (lastTransactionLt && BigInt(tx.transaction_id.lt) <= BigInt(lastTransactionLt)) continue;

          // Обновляем lastTransactionLt
          lastTransactionLt = tx.transaction_id.lt;

          // Проверяем входящие транзакции
          if (tx.in_msg && tx.in_msg.source) {
            const fromAddress = tx.in_msg.source;
            const amount = parseInt(tx.in_msg.value);
            const payload = tx.in_msg.message;

            // Пытаемся декодировать payload
            let decodedPayload = '';
            if (payload) {
              decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
            }

            // Проверяем, содержит ли payload идентификатор пользователя
            if (decodedPayload.startsWith('deposit:')) {
              const userWalletAddress = decodedPayload.replace('deposit:', '').trim();

              // Обновляем баланс пользователя
              userBalances[userWalletAddress] = (userBalances[userWalletAddress] || 0) + amount;
              console.log(`Received ${amount} nanoton from ${fromAddress} for ${userWalletAddress}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    }, 5000); // Опрашиваем каждые 5 секунд
  } catch (error) {
    console.error('Error in monitorIncomingTransactions:', error);
  }
}

// Запускаем функцию отслеживания транзакций
monitorIncomingTransactions();

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
