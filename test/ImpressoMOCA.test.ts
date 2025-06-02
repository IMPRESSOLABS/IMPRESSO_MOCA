// Converted from ImpressoMOCA.test.js to TypeScript
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer, Wallet } from "ethers";
import { ImpressoMOCA } from "../typechain-types";

describe("ImpressoMOCA", function () {
  let Moca: any, moca: ImpressoMOCA, owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    Moca = await ethers.getContractFactory("ImpressoMOCA");
    moca = await upgrades.deployProxy(Moca, ["MOCA", "MOCA"], { initializer: "initialize" }) as ImpressoMOCA;
  });

  it("should allow owner to mint tokens", async function () {
    await moca.mint(await owner.getAddress(), 1000);
    expect(await moca.balanceOf(await owner.getAddress())).to.equal(1000);
  });

  it("should allow owner to burn their own tokens", async function () {
    await moca.mint(await owner.getAddress(), 500);
    await moca.burn(200);
    expect(await moca.balanceOf(await owner.getAddress())).to.equal(300);
  });

  it("should not allow non-owner to burn tokens", async function () {
    await moca.mint(await addr1.getAddress(), 500);
    await expect(moca.connect(addr1).burn(100)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should allow transfer between accounts", async function () {
    await moca.mint(await owner.getAddress(), 1000);
    await moca.transfer(await addr1.getAddress(), 400);
    expect(await moca.balanceOf(await addr1.getAddress())).to.equal(400);
    expect(await moca.balanceOf(await owner.getAddress())).to.equal(600);
  });

  it("should pause and unpause transfers", async function () {
    await moca.mint(await owner.getAddress(), 100);
    await moca.pause();
    await expect(moca.transfer(await addr1.getAddress(), 10)).to.be.revertedWithCustomError(moca, "TokenTransferWhilePaused");
    await moca.unpause();
    await moca.transfer(await addr1.getAddress(), 10);
    expect(await moca.balanceOf(await addr1.getAddress())).to.equal(10);
  });

  it("should block blacklisted addresses from sending/receiving", async function () {
    await moca.mint(await owner.getAddress(), 100);
    await moca.setBlacklist(await addr1.getAddress(), true);
    await expect(moca.transfer(await addr1.getAddress(), 10)).to.be.revertedWithCustomError(moca, "BlacklistedAddress");
    await moca.setBlacklist(await addr1.getAddress(), false);
    await moca.transfer(await addr1.getAddress(), 10);
    await moca.setBlacklist(await owner.getAddress(), true);
    await expect(moca.transfer(await addr2.getAddress(), 10)).to.be.revertedWithCustomError(moca, "BlacklistedAddress");
  });

  it("should lock tokens and prevent transfer until unlocked", async function () {
    await moca.mint(await owner.getAddress(), 100);
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    await moca.lockTokens(await owner.getAddress(), now + 1000);
    await expect(moca.transfer(await addr1.getAddress(), 10)).to.be.revertedWithCustomError(moca, "TokensAreLocked");
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine", []);
    await moca.transfer(await addr1.getAddress(), 10);
    expect(await moca.balanceOf(await addr1.getAddress())).to.equal(10);
  });

  describe("RBAC Roles", function () {
    it("should allow DEFAULT_ADMIN_ROLE to grant and revoke roles", async function () {
      const MINTER_ROLE = await moca.MINTER_ROLE();
      await moca.grantRole(MINTER_ROLE, await addr1.getAddress());
      expect(await moca.hasRole(MINTER_ROLE, await addr1.getAddress())).to.be.true;
      await moca.revokeRole(MINTER_ROLE, await addr1.getAddress());
      expect(await moca.hasRole(MINTER_ROLE, await addr1.getAddress())).to.be.false;
    });

    it("should only allow MINTER_ROLE to mint", async function () {
      const MINTER_ROLE = await moca.MINTER_ROLE();
      await expect(moca.connect(addr1).mint(await addr1.getAddress(), 1000)).to.be.revertedWith(
        `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${MINTER_ROLE}`
      );
      await moca.grantRole(MINTER_ROLE, await addr1.getAddress());
      await moca.connect(addr1).mint(await addr1.getAddress(), 1000);
      expect(await moca.balanceOf(await addr1.getAddress())).to.equal(1000);
    });

    it("should only allow PAUSER_ROLE to pause and unpause", async function () {
      const PAUSER_ROLE = await moca.PAUSER_ROLE();
      await expect(moca.connect(addr1).pause()).to.be.revertedWith(
        `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${PAUSER_ROLE}`
      );
      await moca.grantRole(PAUSER_ROLE, await addr1.getAddress());
      await moca.connect(addr1).pause();
      expect(await moca.paused()).to.be.true;
      await moca.connect(addr1).unpause();
      expect(await moca.paused()).to.be.false;
    });

    it("should only allow UPGRADER_ROLE to upgrade (authorizeUpgrade)", async function () {
      // This is a stub, as upgrades are handled by the proxy admin in tests.
      // You can add a test for _authorizeUpgrade if you expose it for testing or use a mock.
      // For now, just check the role assignment logic.
      const UPGRADER_ROLE = await moca.UPGRADER_ROLE();
      await moca.grantRole(UPGRADER_ROLE, await addr1.getAddress());
      expect(await moca.hasRole(UPGRADER_ROLE, await addr1.getAddress())).to.be.true;
      await moca.revokeRole(UPGRADER_ROLE, await addr1.getAddress());
      expect(await moca.hasRole(UPGRADER_ROLE, await addr1.getAddress())).to.be.false;
    });

    it("should only allow DEFAULT_ADMIN_ROLE to grant/revoke roles", async function () {
      const MINTER_ROLE = await moca.MINTER_ROLE();
      await expect(moca.connect(addr1).grantRole(MINTER_ROLE, await addr2.getAddress())).to.be.revertedWith(
        `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      );
    });
  });

  describe("RBAC Minting Permissions", function () {
    let MINTER_ROLE: string, DEFAULT_ADMIN_ROLE: string;
    beforeEach(async function () {
      MINTER_ROLE = await moca.MINTER_ROLE();
      DEFAULT_ADMIN_ROLE = await moca.DEFAULT_ADMIN_ROLE();
    });

    it("should not allow non-MINTER role to mint", async function () {
      await expect(moca.connect(addr1).mint(await addr1.getAddress(), 1000)).to.be.revertedWith(
        `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });

    it("should not allow ADMIN without MINTER role to mint", async function () {
      // Grant DEFAULT_ADMIN_ROLE to addr1, but not MINTER_ROLE
      await moca.grantRole(DEFAULT_ADMIN_ROLE, await addr1.getAddress());
      await expect(moca.connect(addr1).mint(await addr1.getAddress(), 1000)).to.be.revertedWith(
        `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });

    it("should allow MINTER role to mint", async function () {
      await moca.grantRole(MINTER_ROLE, await addr1.getAddress());
      await moca.connect(addr1).mint(await addr1.getAddress(), 1000);
      expect(await moca.balanceOf(await addr1.getAddress())).to.equal(1000);
    });

    it("should allow ADMIN with MINTER role to mint", async function () {
      await moca.grantRole(DEFAULT_ADMIN_ROLE, await addr1.getAddress());
      await moca.grantRole(MINTER_ROLE, await addr1.getAddress());
      await moca.connect(addr1).mint(await addr1.getAddress(), 1000);
      expect(await moca.balanceOf(await addr1.getAddress())).to.equal(1000);
    });
  });

  describe("Batch Transfer", function () {
    let batchRecipients: string[], batchAmounts: bigint[];

    beforeEach(async function () {
      // Mint enough tokens to owner for batch transfers
      await moca.mint(await owner.getAddress(), 10000);
      // Generate 100 unique addresses
      batchRecipients = [];
      batchAmounts = [];
      for (let i = 0; i < 100; i++) {
        const wallet = Wallet.createRandom();
        batchRecipients.push(wallet.address);
        batchAmounts.push(1n);
      }
    });

    it("should batch transfer 100 transactions", async function () {
      await moca.batchTransfer(batchRecipients, batchAmounts);
      for (let i = 0; i < 100; i++) {
        expect(await moca.balanceOf(batchRecipients[i])).to.equal(1);
      }
    });

    it("should batch transfer less than 100 transactions", async function () {
      const recipients = batchRecipients.slice(0, 10);
      const amounts = batchAmounts.slice(0, 10);
      await moca.batchTransfer(recipients, amounts);
      for (let i = 0; i < 10; i++) {
        expect(await moca.balanceOf(recipients[i])).to.equal(1);
      }
    });

    it("should allow admin to set batch limit", async function () {
      const DEFAULT_ADMIN_ROLE = await moca.DEFAULT_ADMIN_ROLE();
      await moca.grantRole(DEFAULT_ADMIN_ROLE, await addr1.getAddress());
      await moca.connect(addr1).setBatchLimit(50);
      expect(await moca.batchLimit()).to.equal(50);
    });

    it("should allow admin to set batch limit below 100", async function () {
      const DEFAULT_ADMIN_ROLE = await moca.DEFAULT_ADMIN_ROLE();
      await moca.grantRole(DEFAULT_ADMIN_ROLE, await addr1.getAddress());
      await moca.connect(addr1).setBatchLimit(10);
      expect(await moca.batchLimit()).to.equal(10);
    });

    it("should not allow setting batch limit above 100", async function () {
      const DEFAULT_ADMIN_ROLE = await moca.DEFAULT_ADMIN_ROLE();
      await moca.grantRole(DEFAULT_ADMIN_ROLE, await addr1.getAddress());
      await expect(moca.connect(addr1).setBatchLimit(101)).to.be.revertedWith("Batch limit must be 1-100");
    });

    it("should not allow batch transfer above limit", async function () {
      await moca.setBatchLimit(5);
      const recipients = batchRecipients.slice(0, 6);
      const amounts = batchAmounts.slice(0, 6);
      await expect(moca.batchTransfer(recipients, amounts)).to.be.revertedWith("Exceeds batch limit");
    });

    it("should only allow admin to set batch limit", async function () {
      await expect(moca.connect(addr1).setBatchLimit(10)).to.be.reverted;
    });

    it("should not allow non-admin to set batch limit", async function () {
      await expect(moca.connect(addr2).setBatchLimit(10)).to.be.reverted;
    });
  });
});
