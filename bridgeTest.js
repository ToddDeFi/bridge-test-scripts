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

  const distributorContractAddress = '0x16B7808Da13237046dF4961eD4EAE5E6A08CaF6B';
  const distributorContract = new ethers.Contract(distributorContractAddress, distributorContractAbi, mainWallet);

  const stablePlusTokenAddress = '0x6Af0c089b809a0E08cf84c6538A46C17dF234Ab3';
  const tokenContract = new ethers.Contract(stablePlusTokenAddress, erc20ContractAbi, mainWallet);

  const tokenAmountToMint = ethers.utils.parseUnits('10', 'ether');
  const mintTx = await tokenContract.mint(mainWallet.address, tokenAmountToMint);
  await mintTx.wait();
  
  console.log('Успешно создано 10 Stable+ токенов. Хэш транзакции:', mintTx.hash);

  const tokenAmount = ethers.utils.parseUnits('10', 'ether');

  // Отправляем транзакцию approve от основного аккаунта
  const approveTx = await tokenContract.approve(distributorContractAddress, tokenAmountToMint);
  await approveTx.wait();

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
