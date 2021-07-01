const SmartWallet = artifacts.require("SmartWallet");
const utils = require("./helpers/utils");
const time = require("./helpers/time");
contract("SmartWallet", (accounts) => {
  let [alice, bob] = accounts;
  let smartWalletInstance;
  beforeEach(async () => {
    smartWalletInstance = await SmartWallet.new();
  });
  context("Account creation", async () => {
    it("should be able to create a new account", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      const accountDetails = await smartWalletInstance.getAccountDetails({
        from: alice,
      });
      assert.equal(accountDetails[0], bob, "Incorrect backup wallet.");
    });
    it("should not be able to create a second account with the same address", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await utils.shouldThrow(
        smartWalletInstance.createAccount(bob, {
          from: alice,
        })
      );
    });
  });
  context("Depositing ETH to account", async () => {
    it("should not be able to deposit without an account", async () => {
      await utils.shouldThrow(
        smartWalletInstance.deposit({
          from: alice,
          value: web3.utils.toWei("1", "ether"),
        })
      );
    });
    it("should not be able to deposit with an account that is frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.freezeAccount({
        from: alice,
      });
      await utils.shouldThrow(
        smartWalletInstance.deposit({
          from: alice,
          value: web3.utils.toWei("1", "ether"),
        })
      );
    });
    it("should be able to deposit with an account that is not frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      const accountDetails = await smartWalletInstance.getAccountDetails({
        from: alice,
      });
      assert.equal(
        accountDetails[2].toString(),
        web3.utils.toBN(web3.utils.toWei("1", "ether")).toString(),
        "Incorrect ETH amount."
      );
      assert.equal(
        await web3.eth.getBalance(smartWalletInstance.address),
        web3.utils.toWei("1", "ether"),
        "Incorrect ETH balance in contract."
      );
    });
  });
  context("Withdrawing ETH from account", async () => {
    it("should not be able to initiate a withdrawal if the account is frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.freezeAccount({ from: alice });
      await utils.shouldThrow(
        smartWalletInstance.initiateWithdrawal(web3.utils.toWei("0.1", "ether"))
      );
    });
    it("should not be able to initiate a withdrawal for an amount greater than the account balance", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await utils.shouldThrow(
        smartWalletInstance.initiateWithdrawal(web3.utils.toWei("2", "ether"))
      );
    });
    it("should be able to initiate a withdrawal", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      const withdrawalDetails = await smartWalletInstance.getWithdrawalDetails({
        from: alice,
      });
      assert.equal(
        withdrawalDetails[0].toString(),
        "0",
        "Incorrect withdrawal status"
      );
      assert.equal(
        withdrawalDetails[1].toString(),
        web3.utils.toBN(web3.utils.toWei("0.2", "ether")).toString(),
        "Incorrect ETH amount."
      );
    });
    it("should not be able to cancel a withdrawal if the account is frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.freezeAccount({ from: alice });
      await time.advanceTime(time.duration.days(1));
      await utils.shouldThrow(smartWalletInstance.cancelWithdrawal());
    });
    it("should be able to cancel the last withdrawal", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      await smartWalletInstance.cancelWithdrawal();
      const withdrawalDetails = await smartWalletInstance.getWithdrawalDetails({
        from: alice,
      });
      assert.equal(
        withdrawalDetails[0].toString(),
        "1",
        "Incorrect withdrawal status"
      );
      assert.equal(
        withdrawalDetails[1].toString(),
        web3.utils.toBN(web3.utils.toWei("0.2", "ether")).toString(),
        "Incorrect ETH amount."
      );
    });
    it("should not be able to complete a withdrawal if the account is frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.freezeAccount({ from: alice });
      await time.advanceTime(time.duration.days(1));
      await utils.shouldThrow(
        smartWalletInstance.completeWithdrawal(web3.utils.toWei("0.1", "ether"))
      );
    });
    it("should not be able to complete a cancelled withdrawal", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.cancelWithdrawal();
      await time.advanceTime(time.duration.days(1));
      await utils.shouldThrow(
        smartWalletInstance.completeWithdrawal(web3.utils.toWei("0.1", "ether"))
      );
    });
    it("should not be able to complete a withdrawal for a different amount than the last initiated withdrawal", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      await time.advanceTime(time.duration.days(1));
      await utils.shouldThrow(
        smartWalletInstance.completeWithdrawal(web3.utils.toWei("0.1", "ether"))
      );
    });
    it("should not be able to complete a withdrawal if it's been less than 24hrs since initiated", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      await utils.shouldThrow(
        smartWalletInstance.completeWithdrawal(web3.utils.toWei("0.2", "ether"))
      );
    });
    it("should not be able to complete a withdrawal if it's been more than 48hrs since initiated", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      await time.advanceTime(time.duration.days(3));
      await utils.shouldThrow(
        smartWalletInstance.completeWithdrawal(web3.utils.toWei("0.2", "ether"))
      );
    });
    it("should be able to complete a withdrawal 24hrs after its been initiated.", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.1", "ether")
      );
      await smartWalletInstance.initiateWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      await time.advanceTime(time.duration.days(1));
      await smartWalletInstance.completeWithdrawal(
        web3.utils.toWei("0.2", "ether")
      );
      const withdrawalDetails = await smartWalletInstance.getWithdrawalDetails({
        from: alice,
      });
      const accountDetails = await smartWalletInstance.getAccountDetails({
        from: alice,
      });
      assert.equal(
        withdrawalDetails[0].toString(),
        "2",
        "Incorrect withdrawal status"
      );
      assert.equal(
        withdrawalDetails[1].toString(),
        web3.utils.toBN(web3.utils.toWei("0.2", "ether")).toString(),
        "Incorrect ETH amount."
      );
      assert.equal(
        accountDetails[2].toString(),
        web3.utils.toBN(web3.utils.toWei("0.8", "ether")).toString(),
        "Incorrect ETH amount."
      );
      assert.equal(
        await web3.eth.getBalance(smartWalletInstance.address),
        web3.utils.toWei("0.8", "ether")
      );
    });
  });
  context("Withdrawing ETH to backup wallet", async () => {
    it("should not be able to withdraw to backup wallet if account is not frozen", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await utils.shouldThrow(
        smartWalletInstance.withdrawToBackup(web3.utils.toWei("0.1", "ether"))
      );
    });
    it("should not be able to withdraw to backup wallet an amount greater than the account balance", async () => {
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.freezeAccount({ from: alice });
      await utils.shouldThrow(
        smartWalletInstance.withdrawToBackup(web3.utils.toWei("2", "ether"))
      );
    });
    it("should be able to withdraw to backup wallet an amount that is equal to or less than the account balance", async () => {
      const initialBalance = await web3.eth.getBalance(bob);
      await smartWalletInstance.createAccount(bob, {
        from: alice,
      });
      await smartWalletInstance.deposit({
        from: alice,
        value: web3.utils.toWei("1", "ether"),
      });
      await smartWalletInstance.freezeAccount({ from: alice });
      await smartWalletInstance.withdrawToBackup(
        web3.utils.toWei("0.1", "ether")
      );
      const newBalance = await web3.eth.getBalance(bob);
      assert.equal(
        newBalance,
        +initialBalance + +web3.utils.toWei("0.1", "ether")
      );
      assert.equal(
        await web3.eth.getBalance(smartWalletInstance.address),
        web3.utils.toWei("0.9", "ether")
      );
    });
  });
});
