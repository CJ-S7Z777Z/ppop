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

app.post('/check-transaction', async (req, res) => {
    const { paymentId } = req.body;

    try {
        const walletAddress = 'UQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBVzah';

        // Получаем последние 10 входящих транзакций на наш кошелек
        const response = await axios.get(`https://toncenter.com/api/v2/getTransactions`, {
            params: {
                address: walletAddress,
                limit: 10,
                api_key: TONCENTER_API_KEY
            }
        });

        const transactions = response.data.result;

        // Ищем транзакцию с нашим уникальным идентификатором в комментарии
        const transaction = transactions.find(tx => {
            // Получаем "comment" из payload
            if (tx.in_msg.msg_data && tx.in_msg.msg_data['@type'] === 'msg.dataText') {
                const comment = tx.in_msg.msg_data.text;

                if (comment && comment.includes(paymentId)) {
                    return true;
                }
            }
            return false;
        });

        if (transaction) {
            // Транзакция найдена, проверяем сумму и отправителя
            const amountNano = transaction.in_msg.value; // сумма в нанокоинах
            const amount = TonWeb.utils.fromNano(amountNano);

            // Проверяем, что сумма не менее ожидаемой
            if (parseFloat(amount) >= 0.5) {
                // Отправляем токены пользователю
                const userAddress = transaction.in_msg.source;

                await sendTokens(userAddress); // Реализуйте эту функцию для отправки токенов

                res.json({ status: 'success', message: 'Транзакция подтверждена и токены отправлены.' });
            } else {
                res.json({ status: 'error', message: 'Сумма транзакции менее ожидаемой.' });
            }
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
    // Логика отправки SBT NFT или GRB токенов
    // Необходимо реализовать в соответствии с вашим контрактом
}

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
