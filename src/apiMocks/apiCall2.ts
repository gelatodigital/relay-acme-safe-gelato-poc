import Safe, {
  EthersAdapter,
  PREDETERMINED_SALT_NONCE,
  PredictedSafeProps,
  SafeAccountConfig,
  SafeDeploymentConfig,
  encodeCreateProxyWithNonce,
  encodeMultiSendData,
  encodeSetupCallData,
  getMultiSendCallOnlyContract,
  getProxyFactoryContract,
  getSafeContract,
  predictSafeAddress,
} from "@safe-global/protocol-kit";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import {
  MetaTransactionData,
  OperationType,
  MetaTransactionOptions,
  SafeVersion,
  RelayTransaction,
} from "@safe-global/safe-core-sdk-types";
import { ethers } from "ethers";



interface apiCall2Payload {
  eoa: string;
  signature: any;
  transaction: any;
}

const gasLimit = "8000000";

export const apiCall2 = async (payload: apiCall2Payload) => {
  const ALCHEMY_ID = process.env.ALCHEMY_ID;
  const RPC_URL = `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_ID}`;
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  /// Gelato Relaykit with sponsor key for sponsoredCall
  const GELATO_RELAY_API_KEY = process.env.GELATO_RELAY_API_KEY;
  const relayKit = new GelatoRelayPack(GELATO_RELAY_API_KEY);


  /// ============  Safe SDK instantiation  ============  
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider,
  });

  const signer = payload.eoa;
  const owners = [signer];
  const threshold = 1;

  /// Predetermine safeAddress with predetermined saltNoce ensuring
  /// only this one this one safe will be reteieved associated to this EOA

  const saltNonce = PREDETERMINED_SALT_NONCE;
  const safeVersion: SafeVersion = "1.3.0";
  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold,
  };
  const safeDeploymentConfig: SafeDeploymentConfig = {
    saltNonce,
    safeVersion,
  };
  const safeAddress = await predictSafeAddress({
    ethAdapter: ethAdapter,
    safeAccountConfig,
    safeDeploymentConfig
  })

  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mSafeAddress ${safeAddress}`);


  let safeSdk: Safe;

  try {
    await getSafeContract({
      ethAdapter: ethAdapter,
      safeVersion,
      customSafeAddress: safeAddress,
    });
    console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mAlready deployed`);
    safeSdk = await Safe.create({ ethAdapter: ethAdapter, safeAddress });
  } catch {
    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig,
      safeDeploymentConfig,
    };
    console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mNot yet deployed`);
    safeSdk = await Safe.create({ ethAdapter: ethAdapter, predictedSafe });
  }
  console.log("")

  /// ============  Encoding transaction ============  
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mEncoding transaciton`);
  const signedSafeTx = payload.transaction;

  const safeSingletonContract = await getSafeContract({
    ethAdapter: ethAdapter,
    safeVersion,
  });
  const transactionData = safeSingletonContract.encode("execTransaction", [
    signedSafeTx.data.to,
    signedSafeTx.data.value,
    signedSafeTx.data.data,
    signedSafeTx.data.operation,
    signedSafeTx.data.safeTxGas,
    signedSafeTx.data.baseGas,
    signedSafeTx.data.gasPrice,
    signedSafeTx.data.gasToken,
    signedSafeTx.data.refundReceiver,
    payload.signature,
  ]);

  /// ============  Appending Safe deployment tx if required ============  
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mAppending Safe deployment tx if required`);


  let relayTransactionTarget = "";
  let encodedTransaction = "";
  const isSafeDeployed = await safeSdk.isSafeDeployed();
  if (isSafeDeployed) {
    relayTransactionTarget = safeAddress;
    encodedTransaction = transactionData;
  } else {
    const multiSendCallOnlyContract = await getMultiSendCallOnlyContract({
      ethAdapter: ethAdapter,
      safeVersion,
    });
    relayTransactionTarget = multiSendCallOnlyContract.getAddress();
    const safeSingletonContract = await getSafeContract({
      ethAdapter: ethAdapter,
      safeVersion,
    });

    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig: {
        owners: [payload.eoa],
        threshold: 1,
      },
      safeDeploymentConfig: {
        saltNonce: PREDETERMINED_SALT_NONCE,
      },
    };

    const initializer = await encodeSetupCallData({
      ethAdapter: ethAdapter,
      safeContract: safeSingletonContract,
      safeAccountConfig: predictedSafe.safeAccountConfig,
    });

    const safeProxyFactoryContract = await getProxyFactoryContract({
      ethAdapter: ethAdapter,
      safeVersion,
    });

    const safeDeploymentTransaction: MetaTransactionData = {
      to: safeProxyFactoryContract.getAddress(),
      value: "0",
      data: encodeCreateProxyWithNonce(
        safeProxyFactoryContract,
        safeSingletonContract.getAddress(),
        initializer
      ),
      operation: OperationType.Call,
    };
    const safeTransaction: MetaTransactionData = {
      to: safeAddress,
      value: "0",
      data: transactionData,
      operation: OperationType.Call,
    };

    const multiSendData = encodeMultiSendData([
      safeDeploymentTransaction,
      safeTransaction,
    ]);
    encodedTransaction = multiSendCallOnlyContract.encode("multiSend", [
      multiSendData,
    ]);
  }
  console.log(" ")

  /// ============  Relaying transaciton ============  
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mRelaying the transaction`);
  const chainId = await ethAdapter.getChainId();
  const options: MetaTransactionOptions = {
    gasLimit: gasLimit,
    isSponsored: true,
  };

  const relayTransaction: RelayTransaction = {
    target: relayTransactionTarget,
    encodedTransaction: encodedTransaction,
    chainId,
    options,
  };
  const response = await relayKit.relayTransaction(relayTransaction);
  return `https://relay.gelato.digital/tasks/status/${response.taskId}` ;
};
