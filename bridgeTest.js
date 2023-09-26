const { ethers } = require('ethers');
const readline = require('readline'); 

const distributorContractAbi = require('./abi/distributor.json');
const erc20ContractAbi = require('./abi/erc-20.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getUserPrivateKey() {
  return new Promise((resolve) => {
    rl.question('Введите приватный ключ: ', (privateKey) => {
      resolve(privateKey);
      rl.close();
    });
  });
}

async function distributeFundsAndTokens() {
  const mainWalletPrivateKey = await getUserPrivateKey(); 
  const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet.blockpi.network/v1/rpc/public');
  const mainWallet = new ethers.Wallet(mainWalletPrivateKey, provider);

  const distributorContractAddress = '0x7C7b4670b79c62b878d49F6F883F847108739731';
  const distributorContract = new ethers.Contract(distributorContractAddress, distributorContractAbi, mainWallet);

  const stablePlusTokenAddress = '0x6Af0c089b809a0E08cf84c6538A46C17dF234Ab3';
  const tokenContract = new ethers.Contract(stablePlusTokenAddress, erc20ContractAbi, mainWallet);

  const tokenAmount = ethers.utils.parseUnits('10', 'ether');
  const mintTx = await tokenContract.mint(distributorContractAddress, tokenAmount);
  await mintTx.wait();
  
  console.log('Успешно создано 10 Stable+ токенов. Хэш транзакции:', mintTx.hash);

  // Отправляем транзакцию approve от основного аккаунта
  // const approveTx = await tokenContract.approve(distributorContractAddress, tokenAmount);
  // await approveTx.wait();

  const recipients = [];

  for (let i = 0; i < 10; i++) {
    const newWallet = ethers.Wallet.createRandom();
    const newWalletAddress = newWallet.address;
    recipients.push(newWalletAddress);
  }

  const valueToSend = ethers.utils.parseUnits('0.001', 'ether');

  const tx = await distributorContract.distributeFundsAndTokens(recipients, tokenAmount, { value: valueToSend });

  console.log('Транзакция отправлена. Хэш транзакции:', tx.hash);
}

distributeFundsAndTokens().catch(error => console.error('Ошибка:', error));
