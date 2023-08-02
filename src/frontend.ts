import { TypedDataDomain, TypedDataField, ethers } from "ethers";

export interface TypedDataSigner {
  _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string>;
}

export interface SafeTransactionEIP712Args {
  safeAddress: string;
  safeVersion: string;
  chainId: number;
  safeTransactionData: SafeTransactionData;
}

import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

import { apiCall1 } from "./apiMocks/apiCall1";
import {
  GenerateTypedData,
  SafeSignature,
  SafeTransaction,
  SafeTransactionData,
} from "@safe-global/safe-core-sdk-types";
import { apiCall2 } from "./apiMocks/apiCall2";
import { signTransaction } from "./signing";

const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
const RPC_URL = `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function relayTransaction() {
  /// Social login mock --> eoa and signer(pk)
  const eoa = await signer.getAddress();
  console.log('\x1b[34m%s\x1b[0m', '    =====   SocialL Login   =============================');
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mEOA ${eoa}`);
  console.log(" ")

  
  /// Fist Api call passing -- eoa
  console.log('\x1b[34m%s\x1b[0m', '    =====   API Call 1  =============================');
  const { standardizedSafeTx, safeAddress, safeVersion, chainId } = await apiCall1({ eoa });
  console.log(" ")


  /// Fronted signing of the callData
  console.log('\x1b[34m%s\x1b[0m', '    =====   Signing  =============================');
  const signature = await signTransaction(
    standardizedSafeTx,
    safeAddress,
    safeVersion,
    chainId,
    signer
  );
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30mSignature ${signature}`);
  console.log(" ")

  /// Second Api call will return taskId relayed request
  console.log('\x1b[34m%s\x1b[0m', '    =====   API Call 2  =============================');
  const payload = {
    eoa,
    transaction: standardizedSafeTx,
    signature,
  };

  
  const taskId = await apiCall2(payload);
  console.log('\x1b[32m%s\x1b[0m', '    ->', `\x1b[30m${taskId}`);
}
relayTransaction();
