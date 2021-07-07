# SmartWallet

SmartWallet is a smart contract based wallet that protects your assets even if your private key gets compromised. It has a two-step (initiate and complete) withdrawal process so that you can be notified whenever a withdrawal is initiated, giving you time to cancel fraudulant transactions before it is completed. If your private key is ever compromised, you can freeze your account and withdraw your assets to the backup wallet you specified when you first created your SmartWallet. Here's how it works:

1. Create a SmartWallet by calling `createAccount` while specifying your backup wallet.
2. Setup notifications with a 3rd party provider for events `Deposited`, `WithdrawIntiated`, `WithdrawCancelled`, `WithdrawCompleted`, `WithdrewToBackup`, and `AccountFrozen`.
3. Make deposits by calling `deposit`.
4. Make withdrawals by first calling `initiateWithdrawal`, then between 24-48hrs later, calling `completeWithdrawal`. `cancelWithdrawal` allows you to cancel the last initiated withdrawal.
5. If you believe your private key has been compromised, call `freezeAccount` to disable withdrawals to any account other than your backup wallet.
6. Once you've frozen your account, call `withdrawToBackup` to withdraw your assets.

The smart-wallet contract is a proof-of-concept and should not be used on mainnet. The contract is missing some key features, and needs to be thoroughly tested and audited. This contract is just the first step in defining a more resilient and practical wallet for the everyday user.
