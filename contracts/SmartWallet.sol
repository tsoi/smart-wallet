pragma solidity ^0.8.3;

/**
 * @title Smart Wallet Contract
 * @notice A wallet that protects your assets even if your private key gets compromised.
 * @dev This contract is a proof of concept and should not be used in mainnet/production. 
 * @author Kevin Tsoi
 */
contract SmartWallet {

    event Deposited(address indexed from, uint amount);
    event WithdrawIntiated(address indexed to, uint amount);
    event WithdrawCancelled(address indexed to, uint amount);
    event WithdrawCompleted(address indexed to, uint amount);
    event WithdrewToBackup(address indexed to, uint amount);
    event AccountFrozen(address indexed from);

    struct Account{
        address payable backupWallet;
        bool frozen;
        uint ethBalance;
        Withdrawal[] withdrawals;
    }

    enum WithdrawStatus{ INITIATED, CANCELLED, COMPLETED }

    struct Withdrawal{
        WithdrawStatus status;
        uint amount;
        uint32 timestamp;
    }

    mapping(address => Account) private accounts;

    /**
     * @notice Creates a SmartWallet account.
     * @param _backupWallet The address of the wallet you can withdraw to when your account is frozen.
     */
    function createAccount(address payable _backupWallet) external{
        require(accounts[msg.sender].backupWallet == address(0), "Account already exists.");
        accounts[msg.sender].backupWallet = _backupWallet;
    }

    /**
     * @notice Deposit ETH to your SmartWallet account.
     */
    function deposit() external payable hasAccount isNotFrozen{
        require(msg.value > 0, "Deposit amount must be greater than 0.");
        accounts[msg.sender].ethBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Initiates a withdrawal of ETH from your SmartWallet account.
     */
    function initiateWithdrawal(uint _amount) external isNotFrozen{
        require(accounts[msg.sender].ethBalance >= _amount, "Withdraw amount exceeds the balance.");
        accounts[msg.sender].withdrawals.push(Withdrawal(WithdrawStatus.INITIATED, _amount, uint32(block.timestamp)));
        emit WithdrawIntiated(msg.sender, _amount);
    }

    /**
     * @notice Cancels the last initiated withdrawal.
     */
    function cancelWithdrawal() external isNotFrozen {
        require(accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1].status == WithdrawStatus.INITIATED);
        Withdrawal storage withdrawal = accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1];
        withdrawal.status = WithdrawStatus.CANCELLED;
        withdrawal.timestamp = uint32(block.timestamp);
        emit WithdrawCancelled(msg.sender, withdrawal.amount);
    }

    /**
     * @notice Completes the last initiated withdrawal request of ETH from your SmartWallet account.
     * @param _amount in WEI to withdraw. Must match the amount from initiateWithdrawal. 
     */
    function completeWithdrawal(uint _amount) external isNotFrozen isValidWithdrawal{
        require(_amount == accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1].amount, "_amount does not match amount from withdrawalId.");
        Withdrawal storage withdrawal = accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1];
        withdrawal.status = WithdrawStatus.COMPLETED;
        withdrawal.timestamp = uint32(block.timestamp);
        accounts[msg.sender].ethBalance -= withdrawal.amount;
        payable(msg.sender).transfer(withdrawal.amount);
        emit WithdrawCompleted(msg.sender, withdrawal.amount);
    }

    /**
     @notice Withdraw ETH from your Smart Wallet account to your backup wallet.
     @param _amount in WEI to withdraw.
     */
    function withdrawToBackup(uint _amount) external isFrozen{ 
        require(accounts[msg.sender].ethBalance >= _amount, "Withdraw amount exceeds the balance.");
        Account storage myAccount = accounts[msg.sender];
        myAccount.ethBalance -= _amount;
        payable(myAccount.backupWallet).transfer(_amount);
        emit WithdrewToBackup(myAccount.backupWallet, _amount);
    }

    /**
     * @notice Freezes your account which means you will no longer be able to withdraw to your wallet, and can only withdraw to your backup wallet. Action is not reversible. Use when you believe your wallet has been compromised.
     */
    function freezeAccount() external hasAccount{
        accounts[msg.sender].frozen = true;
        emit AccountFrozen(msg.sender);
    }

    /**
     @notice Returns your account details.
     @return Your wallet's address, if it's been frozen, the ETH (in WEI) balance, unlock start time, and unlock end time.
     */
    function getAccountDetails() external view returns(address, bool, uint){
        Account memory myAccount = accounts[msg.sender];
        return (myAccount.backupWallet, myAccount.frozen, myAccount.ethBalance);
    }

    function getWithdrawalDetails() external view returns(WithdrawStatus, uint, uint32){
        Withdrawal memory withdrawal = accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1];
        return (withdrawal.status, withdrawal.amount, withdrawal.timestamp);
    }

    modifier hasAccount(){
        require(accounts[msg.sender].backupWallet != address(0), "Account doesn't exist.");
        _;
    }

    modifier isValidWithdrawal(){
        Withdrawal memory withdrawal = accounts[msg.sender].withdrawals[accounts[msg.sender].withdrawals.length-1];
        require(withdrawal.status == WithdrawStatus.INITIATED && withdrawal.timestamp + 1 days <= block.timestamp && withdrawal.timestamp + 2 days >= block.timestamp);
        _;
    }

    modifier isNotFrozen(){
        require(accounts[msg.sender].frozen != true, "Account is frozen.");
        _;
    }

    modifier isFrozen(){
        require(accounts[msg.sender].frozen == true, "Account is not frozen.");
        _;
    }

}