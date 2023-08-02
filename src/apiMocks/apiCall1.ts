import Safe, {
  EthersAdapter,
  PREDETERMINED_SALT_NONCE,
  PredictedSafeProps,
  SafeAccountConfig,
  SafeDeploymentConfig,
  getSafeContract,
  predictSafeAddress,
} from "@safe-global/protocol-kit";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import {
  MetaTransactionData,
  OperationType,
  MetaTransactionOptions,
  SafeVersion,
} from "@safe-global/safe-core-sdk-types";
import { ethers } from "ethers";

import ContractInfo from "./ABI.json";

interface apiCall1Payload {
  eoa: string;
}

const targetAddress = ContractInfo.address;

const gasLimit = "8000000";

export const apiCall1 = async (payload: apiCall1Payload) => {

  const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
  const RPC_URL = `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY}`;
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


  /// ============  Mock CallData ============  

  const nftContract = new ethers.Contract(
    targetAddress,
    ContractInfo.abi,
    provider
  );


  /// ============  Build Metatransaction ============  

  const safeTransactionData: MetaTransactionData = {
    to: targetAddress,
    data: nftContract.interface.encodeFunctionData("increment", []),
    value: "0",
    operation: OperationType.Call,
  };
  const options: MetaTransactionOptions = {
    gasLimit,
    isSponsored: true,
  };

  const standardizedSafeTx = await relayKit.createRelayedTransaction(
    safeSdk,
    [safeTransactionData],
    options
  );

  let chainId = await ethAdapter.getChainId();

  /// we are returning the metatransction and relevvant information for the Api 2 call
  return { standardizedSafeTx, safeAddress, safeVersion, chainId }
};
