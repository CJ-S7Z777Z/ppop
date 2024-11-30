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
async function monitorIncomingTransactions() {
  try {
    console.log('Начинаем отслеживание входящих транзакций...');

    // Храним последнее обработанное значение logical time (lt) транзакции
    let lastTransactionLt = null;
    let lastTransactionHash = null;

    // Периодически опрашиваем блокчейн
    setInterval(async () => {
      try {
        // Получаем последние транзакции
        const limit = 30; // Количество транзакций для получения за один запрос
        const transactions = await tonweb.provider.getTransactions(appWalletAddress, limit, lastTransactionLt, lastTransactionHash);

        for (const tx of transactions) {
          const txLt = tx.transaction_id.lt;
          const txHash = tx.transaction_id.hash;

          // Если уже обработали эту транзакцию, переходим к следующей
          if (lastTransactionLt && BigInt(txLt) <= BigInt(lastTransactionLt)) continue;

          // Обновляем lastTransactionLt и lastTransactionHash
          lastTransactionLt = txLt;
          lastTransactionHash = txHash;

          // Проверяем входящие транзакции
          if (tx.in_msg && tx.in_msg.source) {
            const fromAddress = tx.in_msg.source;
            const amount = parseInt(tx.in_msg.value); // Сумма в нанотонах
            const payload = tx.in_msg.msg_data?.text || tx.in_msg.msg_data?.body || '';

            // Пытаемся декодировать payload (предполагаем, что это UTF-8 текст)
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

              // Проверяем, что userWalletAddress является валидным TON-адресом
              if (TonWeb.utils.Address.isValid(userWalletAddress)) {
                // Указываем комиссию в нанотонах (например, 0.12 TON)
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
