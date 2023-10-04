/* eslint-disable no-undef */
const { ethers } = require('ethers');
const readline = require('readline');

const distributorContractAbi = require('./abi/distributor.json');
const erc20ContractAbi = require('./abi/erc-20.json');
const bridgeContractAbi = require('./abi/bridge.json');

const distributorContractAddress = '0x7C7b4670b79c62b878d49F6F883F847108739731';
const bridgeContractAddress = '0x8e3b66eD6865Ce6Ac5a9C64E5099e86C7CdAb6be';
const stablePlusTokenAddress = '0x6Af0c089b809a0E08cf84c6538A46C17dF234Ab3';

const valueToSend = ethers.utils.parseUnits('0.1', 'ether');
const tokenAmount = ethers.utils.parseUnits('10', 'ether');

const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet.blockpi.network/v1/rpc/public');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getUserPrivateKey() {
  return new Promise((resolve) => {
    rl.question('Enter your private key: ', (privateKey) => {
      resolve(privateKey);
      rl.close();
    });
  });
}

async function sendBridgeTransaction(recipient, tokenAmount) {
  const recipientWallet = new ethers.Wallet(recipient.privateKey, provider);
  const nonce = await recipientWallet.getTransactionCount();

  const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeContractAbi, recipientWallet);

  const token = new ethers.Contract(stablePlusTokenAddress, erc20ContractAbi, recipientWallet);
  const approveTx = await token.approve(bridgeContractAddress, tokenAmount);
  await approveTx.wait();

  const bridgeTx = await bridgeContract.create(
    1, 
    BigInt(1e18), 
    943,
    recipient.address,
    false,{
      nonce: nonce + 1,
      gasPrice: ethers.utils.parseUnits('5', 'gwei'),
      gasLimit: 500000,
    }
  );

  console.log(`Transaction created for address ${recipient.address}. Transaction Hash:`, bridgeTx.hash);
}

async function distributeFundsAndTokens() {
  const mainWalletPrivateKey = await getUserPrivateKey();

  const mainWallet = new ethers.Wallet(mainWalletPrivateKey, provider);

  const distributorContract = new ethers.Contract(distributorContractAddress, distributorContractAbi, mainWallet);

  const tokenContract = new ethers.Contract(stablePlusTokenAddress, erc20ContractAbi, mainWallet);

  const mintTx = await tokenContract.mint(distributorContractAddress, tokenAmount);
  await mintTx.wait();

  console.log('Successfully created 10 Stable+ tokens. Transaction Hash:', mintTx.hash);

  const recipients = [];

  for (let i = 0; i < 10; i++) {
    const newWallet = ethers.Wallet.createRandom();
    const newWalletAddress = newWallet.address;
    const newWalletPrivateKey = newWallet.privateKey;
    recipients.push({ address: newWalletAddress, privateKey: newWalletPrivateKey });
  }

  const addresses = recipients.map(recipient => recipient.address);
  const tx = await distributorContract.distributeFundsAndTokens(addresses, tokenAmount, { value: valueToSend });
  await tx.wait();

  const promises = recipients.map(recipient => sendBridgeTransaction(recipient, tokenAmount));

  await promiseAllByIterations(promises, 2); 
}

async function promiseAllByIterations(promises, numberPerIteration) {
  const iterationsCount =
    promises.length % numberPerIteration === 0
      ? parseInt(String(promises.length / numberPerIteration))
      : parseInt(String(promises.length / numberPerIteration + 1));

  console.log(`Start promise all by iterations. | Iterations count: ${iterationsCount}`);

  for (let i = 0; i < iterationsCount; i++) {
    const startIndex = i * numberPerIteration;
    const endIndex = Math.min(startIndex + numberPerIteration, promises.length);

    await Promise.all(promises.slice(startIndex, endIndex));
  }
}

distributeFundsAndTokens().catch(error => console.error('Error:', error));