// server.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TonWeb = require('tonweb');
const app = express();

// Порт сервера
const PORT = process.env.PORT || 3000;

// Статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для обработки JSON в запросах
app.use(bodyParser.json());

// Настройка TonWeb с использованием Toncenter API и вашего API-ключа
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY; // Храните API-ключ в переменных окружения
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', { apiKey: TONCENTER_API_KEY }));

// Простейшая база данных в памяти (объект)
// В реальном приложении замените на настоящую базу данных
let userBalances = {};

// Адрес кошелька приложения (замените на ваш реальный адрес)
const appWalletAddress = 'EQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBV2tk';

// Маршрут для tonconnect-manifest.json
app.get('/tonconnect-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'tonconnect-manifest.json'));
});

// Маршрут для получения баланса пользователя
app.post('/get-balance', async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.json({ success: false, message: 'Не указан адрес кошелька' });
  }

  try {
    // Получаем баланс пользователя из нашей "базы данных"
    const userBalance = userBalances[walletAddress] || 0;

    res.json({ success: true, balance: userBalance });
  } catch (error) {
    console.error('Ошибка при получении баланса пользователя:', error);
    res.json({ success: false, message: 'Ошибка при получении баланса' });
  }
});

// Функция для отслеживания транзакций на адрес приложения
// Функция для отслеживания транзакций на адрес приложения
async function monitorIncomingTransactions() {
    try {
      console.log('Начинаем отслеживание входящих транзакций...');
  
      let lastLt = null;
      let lastHash = null;
  
      setInterval(async () => {
        try {
          const limit = 30;
          const toTransaction = (lastLt && lastHash) ? { lt: lastLt, hash: lastHash } : undefined;
  
          // Корректный вызов getTransactions с объектом toTransaction
          const transactions = await tonweb.provider.getTransactions(appWalletAddress, limit, toTransaction);
  
          if (transactions.length > 0) {
            // Обработка транзакций
            for (const tx of transactions) {
              // Проверяем входящие транзакции
              if (tx.in_msg && tx.in_msg.source) {
                const fromAddress = tx.in_msg.source;
                const amount = parseInt(tx.in_msg.value); // Сумма в нанотонах
                const payload = tx.in_msg.msg_data?.text || tx.in_msg.msg_data?.body || '';
  
                // Декодируем payload
                let decodedPayload = '';
                if (payload) {
                  try {
                    decodedPayload = Buffer.from(payload, 'base64').toString('utf8').trim();
                  } catch (e) {
                    console.warn('Не удалось декодировать payload:', e);
                  }
                }
  
                // Проверяем, содержит ли payload идентификатор пользователя
                if (decodedPayload.startsWith('deposit:')) {
                  const userWalletAddress = decodedPayload.replace('deposit:', '').trim();
  
                  // Валидация адреса кошелька пользователя
                  if (TonWeb.utils.Address.isValid(userWalletAddress)) {
                    // Комиссия в нанотонах (например, 0.12 TON)
                    const commissionInNanoTon = TonWeb.utils.toNano('0.12');
                    const creditedAmount = amount - Number(commissionInNanoTon);
  
                    if (creditedAmount > 0) {
                      // Обновляем баланс пользователя
                      userBalances[userWalletAddress] = (userBalances[userWalletAddress] || 0) + creditedAmount;
                      console.log(`Получено ${creditedAmount} нанотон от ${fromAddress} для пользователя ${userWalletAddress}`);
                    } else {
                      console.warn(`Сумма транзакции меньше комиссии. Транзакция от ${fromAddress} проигнорирована.`);
                    }
                  } else {
                    console.warn(`Невалидный адрес кошелька пользователя в payload: ${userWalletAddress}`);
                  }
                } else {
                  console.warn(`Транзакция без валидного payload от ${fromAddress}`);
                }
              }
            }
  
            // После обработки всех транзакций обновляем lastLt и lastHash
            const lastTx = transactions[transactions.length - 1];
            lastLt = lastTx.transaction_id.lt;
            lastHash = lastTx.transaction_id.hash;
          }
        } catch (error) {
          console.error('Ошибка при получении транзакций:', error);
        }
      }, 5000); // Опрашиваем каждые 5 секунд
    } catch (error) {
      console.error('Ошибка в функции monitorIncomingTransactions:', error);
    }
  }
  

// Запускаем функцию отслеживания транзакций
monitorIncomingTransactions();

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
