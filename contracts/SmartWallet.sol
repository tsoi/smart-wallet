pragma solidity ^0.8.3;

/**
 * @title Smart Wallet Contract
 * @notice A wallet with added security features that allows you to lock or freeze your account. 
 * @dev This contract is a proof of concept and should not be used in mainnet/production. 
 * @author Kevin Tsoi
 */
contract SmartWallet {

    event Deposited(address indexed from, uint amount);
    event WithDrawal(address indexed to, uint amount);
    event WithDrawalToBackup(address indexed to, uint amount);
    event AccountLocked(address indexed from);
    event AccountUnlocked(address indexed from);
    event AccountFrozen(address indexed from);

    struct Account{
        address payable backupWallet;
        bool frozen;
        uint ethBalance;
        uint32 unlockStartTime;
        uint32 unlockEndTime;
    }

    mapping(address => Account) private accounts;
    uint32 defaultUnlockDelay = 1 days;
    uint32 defaultUnlockDuration = 1 days;

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
     * @notice Withdraw ETH from your SmartWallet account.
     * @param _amount in WEI to withdraw.
     */
    function withdraw(uint _amount) external isUnlocked isNotFrozen{ 
        require(accounts[msg.sender].ethBalance > _amount, "Withdraw amount exceeds the balance.");
        accounts[msg.sender].ethBalance -= _amount;
        payable(msg.sender).transfer(_amount);
        emit WithDrawal(msg.sender, _amount);
    }

    /**
     @notice Withdraw ETH from your Smart Wallet account to your backup wallet.
     @param _amount in WEI to withdraw.
     */
    function withdrawToBackup(uint _amount) external isFrozen{ 
        require(accounts[msg.sender].ethBalance > _amount, "Withdraw amount exceeds the balance.");
        Account storage myAccount = accounts[msg.sender];
        myAccount.ethBalance -= _amount;
        payable(myAccount.backupWallet).transfer(_amount);
        emit WithDrawalToBackup(myAccount.backupWallet, _amount);
    }

    /**
     * @notice Locks your account which disables withdrawals until account is unlocked.
     */
    function lockAccount() external isNotFrozen{
        Account storage myAccount = accounts[msg.sender];
        myAccount.unlockStartTime = 0;
        myAccount.unlockEndTime = 0;
        emit AccountLocked(msg.sender);
    }

    /**
     * @notice Unlocks your account which enables withdrawals in 24hrs for 24hrs.
     */
    function unlockAccount() external isNotFrozen{
        Account storage myAccount = accounts[msg.sender];
        myAccount.unlockStartTime = uint32(block.timestamp) + defaultUnlockDelay;
        myAccount.unlockEndTime = myAccount.unlockStartTime + defaultUnlockDuration;
        emit AccountUnlocked(msg.sender);
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
    function getAccountDetails() external view returns(address, bool, uint, uint32, uint32){
        Account memory myAccount = accounts[msg.sender];
        return (myAccount.backupWallet, myAccount.frozen, myAccount.ethBalance, myAccount.unlockStartTime, myAccount.unlockEndTime);
    }

    modifier hasAccount(){
        require(accounts[msg.sender].backupWallet != address(0), "Account doesn't exist.");
        _;
    }

    modifier isUnlocked(){
        Account memory myAccount = accounts[msg.sender];
        require(block.timestamp >= myAccount.unlockStartTime && block.timestamp < myAccount.unlockEndTime, "Account is locked.");
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