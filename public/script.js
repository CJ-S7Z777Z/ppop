// script.js

// Инициализируем TonConnect UI
const tonConnect = new TonConnectUI.TonConnectUI({
  manifestUrl: window.location.origin + '/tonconnect-manifest.json',
});

// Элементы страницы
const connectWalletButton = document.getElementById('connectWalletButton');
const payButton = document.getElementById('payButton');
const statusDiv = document.getElementById('status');

let userWalletAddress = null;

// Функция для подключения кошелька
async function connectWallet() {
  try {
    // Показываем модальное окно для выбора кошелька
    await tonConnect.connectWallet();

    // Проверяем, подключен ли кошелек
    const wallet = tonConnect.connector.wallet;
    if (wallet) {
      userWalletAddress = wallet.account.address;

      statusDiv.innerText = `Кошелек подключен: ${userWalletAddress}`;
      connectWalletButton.style.display = 'none';
      payButton.style.display = 'inline-block';
    } else {
      statusDiv.innerText = 'Кошелек не подключен. Попробуйте снова.';
    }
  } catch (error) {
    console.error('Ошибка подключения кошелька:', error);
    statusDiv.innerText = 'Ошибка подключения кошелька';
  }
}

// Генерация уникального идентификатора платежа
function generateUniqueId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  } else {
    // Простая функция генерации UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Обработчик нажатия на кнопку "Оплатить"
async function initiatePayment() {
  if (!userWalletAddress) {
    statusDiv.innerText = 'Сначала подключите кошелек.';
    return;
  }

  const paymentId = generateUniqueId();
  const amountTON = '0.5';
  const amountNano = TonWeb.utils.toNano(amountTON).toString(); // сумма в нанотокенах
  const destinationWallet = 'UQBDT2vmEdKWRNVcdHiRP3k2JXMsfS5VU-GguXIc2UUBVzah'; // Замените на ваш адрес

  // Сохраняем paymentId для дальнейшего использования
  localStorage.setItem('paymentId', paymentId);

  // Формируем параметры транзакции
  const txRequest = {
    validUntil: Math.floor(Date.now() / 1000) + 300, // Время действия (например, 5 минут)
    messages: [
      {
        address: destinationWallet,
        amount: amountNano,
        stateInit: undefined,
        payload: paymentId,
      },
    ],
  };

  try {
    // Инициируем транзакцию через подключенный кошелек
    await tonConnect.sendTransaction(txRequest);

    statusDiv.innerText = 'Транзакция отправлена. Ожидание подтверждения...';

    // Начинаем периодически проверять статус транзакции
    const intervalId = setInterval(async () => {
      const result = await checkTransactionStatus(paymentId);

      if (result.status === 'success') {
        clearInterval(intervalId);
        statusDiv.innerText = result.message;
      } else if (result.status === 'error') {
        clearInterval(intervalId);
        statusDiv.innerText = result.message;
      } else {
        console.log(result.message);
      }
    }, 5000); // Проверяем каждые 5 секунд
  } catch (error) {
    console.error('Ошибка при отправке транзакции:', error);
    statusDiv.innerText = 'Ошибка при отправке транзакции';
  }
}

// Функция проверки статуса транзакции
async function checkTransactionStatus(paymentId) {
  const response = await fetch('/check-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentId: paymentId,
      userWalletAddress: userWalletAddress
    })
  });

  return response.json();
}

// Обработчики событий
connectWalletButton.addEventListener('click', connectWallet);
payButton.addEventListener('click', initiatePayment);
