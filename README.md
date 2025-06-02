# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## Complie
```bash
npx hardhat compile
```

## Test
```bash
npx hardhat test test/ImpressoMOCA.test.ts
```

## Deployment Hardhat
```bash
npx hardhat run scripts/deployImpressoMOCA.ts --network hardhat/sepolia/arbitrum
```

## Deployment Upgrade Hardhat
```bash
npx hardhat run scripts/upgradeImpressoMOCA.ts --network hardhat/sepolia/arbitrum
```

## Verify Contract
```bash
npx hardhat verify --contract contracts/ImpressoMOCA.sol:ImpressoMOCA --network arbitrum <contract_address>
```