// public/script.js

function generateUniqueId() {
    return crypto.randomUUID();
}

function checkTransactionStatus(paymentId) {
    return fetch('/check-transaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            paymentId: paymentId
        })
    })
    .then(response => response.json());
}

document.getElementById('payButton').addEventListener('click', async () => {
    // Генерируем уникальный идентификатор платежа
    const paymentId = generateUniqueId();

    // Сохраняем его в локальном хранилище
    localStorage.setItem('paymentId', paymentId);

    // Данные кошелька и суммы
    const walletAddress = 'UQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBVzah';
    const amountTON = '0.5'; // сумма оплаты в TON

    // Генерируем ссылку на оплату с уникальным идентификатором
    const amountNano = TonWeb.utils.toNano(amountTON);
    const paymentLink = `https://tonkeeper.app/transfer/${walletAddress}?amount=${amountNano}&text=${paymentId}`;

    // Перенаправляем пользователя для оплаты
    window.open(paymentLink, '_blank');

    // Сообщаем пользователю о проверке платежа
    document.getElementById('status').innerText = 'Проверяем статус платежа...';

    // Периодически проверяем статус платежа
    const intervalId = setInterval(async () => {
        const result = await checkTransactionStatus(paymentId);

        if (result.status === 'success') {
            clearInterval(intervalId);
            document.getElementById('status').innerText = result.message;
        } else if (result.status === 'error') {
            clearInterval(intervalId);
            document.getElementById('status').innerText = result.message;
        } else {
            console.log(result.message);
        }
    }, 5000); // Проверяем каждые 5 секунд
});
