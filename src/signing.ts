import { Signer, TypedDataDomain, TypedDataField, ethers } from "ethers";
import {
  GenerateTypedData,
  SafeSignature,
  SafeTransaction,
  SafeTransactionEIP712Args,
} from "./types";

interface TypedDataSigner {
  _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string>;
}

export const signTransaction = async (
  safeTransaction: any,
  safeAddress: string,
  safeVersion: string,
  chainId: number,
  signer: Signer
): Promise<SafeSignature> => {
  const transaction = safeTransaction;

  const signature = await signTypedData(
    transaction,
    safeAddress,
    safeVersion,
    chainId,
    signer
  );
  return signature;
};

const signTypedData = async (
  safeTransaction: SafeTransaction,
  safeAddress: string,
  safeVersion: string,
  chainId: number,
  signer: Signer
): Promise<any> => {
  const safeTransactionEIP712Args: SafeTransactionEIP712Args = {
    safeAddress,
    safeVersion,
    chainId,
    safeTransactionData: safeTransaction.data,
  };

  if (isTypedDataSigner(signer)) {
    const typedData = generateTypedData(safeTransactionEIP712Args);
    const signature = await signer._signTypedData(
      typedData.domain,
      { SafeTx: typedData.types.SafeTx },
      typedData.message
    );

    return signature;
  } else {
    throw new Error(
      "The current signer does not implement EIP-712 to sign typed data"
    );
  }
};

function generateTypedData({
  safeAddress,
  safeVersion,
  chainId,
  safeTransactionData,
}: SafeTransactionEIP712Args): GenerateTypedData {
  const typedData: GenerateTypedData = {
    types: getEip712MessageTypes(safeVersion),
    domain: {
      verifyingContract: safeAddress,
    },
    primaryType: "SafeTx",
    message: {
      ...safeTransactionData,
      value: safeTransactionData.value,
      safeTxGas: safeTransactionData.safeTxGas,
      baseGas: safeTransactionData.baseGas,
      gasPrice: safeTransactionData.gasPrice,
      nonce: safeTransactionData.nonce,
    },
  };

  typedData.domain.chainId = chainId;

  return typedData;
}

function getEip712MessageTypes(safeVersion: string): {
  EIP712Domain: typeof EIP712_DOMAIN;
  SafeTx: Array<{ type: string; name: string }>;
} {
  return {
    EIP712Domain: EIP712_DOMAIN,
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };
}

const EIP712_DOMAIN = [
  {
    type: "uint256",
    name: "chainId",
  },
  {
    type: "address",
    name: "verifyingContract",
  },
];

function isTypedDataSigner(signer: any): signer is TypedDataSigner {
  return (signer as unknown as TypedDataSigner)._signTypedData !== undefined;
}
