# ACME - SAFE - GELATO
Integrate Safe-Gelato stack into the ACME Protocol replacing the current Biconomy integration

### Spec
The architecture is composed of two components
- Frontend, no sdk integrations only using ethers to sign callDAta
- Backend, no pk available, integration of sdks

### User Flow
1- UI: User logs in with Social login, retrieves eoa and pk. API call 1 passing eoa

2- BACKEND:  get deterministic Safe address,  callData building and returns:  
   - JWT token 
- callData to sign

3- UI: callData signed and API call 2

4- BACKEND:  safe deployment tx appended to callData if not yet deployed. Relay transaction.

### Approach
- Reverse engineer safe-sdk core packages:
   - account-abstraction-kit
   - protocol-kit
   - relay-kit

- Split sdk-core logic into:
   - UI: Signing
   - Backend: Safe instantiation, creating transaction, appending safe deployment and transaction relaying


### Test  

1) Please copy .env.example to .env and add GELATO_RELAY_API_KEY,PRIVATE_KEY and ALCHEMY_ID

```
yarn acme
```




