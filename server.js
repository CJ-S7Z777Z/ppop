// server.js

const express = require('express');
const axios = require('axios');
const TonWeb = require('tonweb');

const app = express();
const port = 3000;

// Ваш ключ API Toncenter
const TONCENTER_API_KEY = '0a16f08838639297e1c12ed9040d9e14a58970fc1ca23f9108bc003018a890c4';

// Инициализация TonWeb
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', { apiKey: TONCENTER_API_KEY }));

app.use(express.json());
app.use(express.static('public'));

// Эндпоинт для проверки статуса транзакции
app.post('/check-transaction', async (req, res) => {
  const { paymentId, userWalletAddress } = req.body;

  try {
    const destinationWallet = 'UQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBVzah'; // Замените на ваш адрес

    // Получаем последние транзакции пользователя
    const response = await axios.get(`https://toncenter.com/api/v2/getTransactions`, {
      params: {
        address: userWalletAddress,
        limit: 10,
        api_key: TONCENTER_API_KEY
      }
    });

    const transactions = response.data.result;

    // Ищем транзакцию с нашим уникальным идентификатором в payload
    const transaction = transactions.find(tx => {
      // Проверяем, что транзакция направлена на наш кошелек и содержит наш paymentId
      if (tx.out_msgs && tx.out_msgs.length > 0) {
        return tx.out_msgs.some(outMsg => {
          if (outMsg.destination === destinationWallet) {
            // Получаем payload (комментарий)
            if (outMsg.msg_data && outMsg.msg_data['@type'] === 'msg.dataText') {
              const comment = outMsg.msg_data.text;

              if (comment && comment.includes(paymentId)) {
                return true;
              }
            }
          }
          return false;
        });
      }
      return false;
    });

    if (transaction) {
      // Транзакция найдена, отправляем токены
      await sendTokens(userWalletAddress); // Отправляем токены на адрес пользователя

      res.json({ status: 'success', message: 'Транзакция подтверждена и токены отправлены.' });
    } else {
      res.json({ status: 'pending', message: 'Транзакция еще не найдена. Попробуйте позже.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Ошибка при проверке транзакции.' });
  }
});

// Функция для отправки токенов
async function sendTokens(toAddress) {
  // Реализуйте функцию отправки SBT NFT или GRB токенов
  // Используйте TonWeb или другую библиотеку для взаимодействия со смарт-контрактом
  // Здесь вы должны написать код, который осуществит отправку токенов на адрес `toAddress`
}

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
