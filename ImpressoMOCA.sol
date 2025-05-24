// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";

contract ImpressoMOCA is ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ERC20SnapshotUpgradeable {
    // NOTE: whitelist field is kept for storage layout compatibility (UUPS upgradeable)
    struct AccountData {
        uint48 lockedUntil;
        uint8 whitelist; // Deprecated: kept for storage compatibility
        uint8 blacklist;
    }
    mapping(address => AccountData) private _accounts;

    // event Whitelisted(address indexed account, bool status); // Deprecated: removed for clarity
    event Blacklisted(address indexed account, bool status);
    event TokensLocked(address indexed account, uint256 until);

    /// @dev Disable initializers on the implementation contract to prevent initialization attacks
    // Remove constructor to comply with OpenZeppelin Upgrades (no constructor allowed)
    // constructor() {
    //     _disableInitializers();
    // }

    function initialize(string memory name, string memory symbol) external initializer {
        __ERC20_init(name, symbol);
        __Ownable_init();
        __Pausable_init();
        __ERC20Snapshot_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Mintable & Burnable ---
    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "Mint amount must be greater than zero");
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyOwner whenNotPaused {
        _burn(msg.sender, amount);
    }

    // --- Pausable ---
    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }

    function setBlacklist(address account, bool status) external onlyOwner {
        uint8 s = status ? 1 : 0;
        if (_accounts[account].blacklist != s) {
            _accounts[account].blacklist = s;
            emit Blacklisted(account, status);
        }
    }
    function isBlacklisted(address account) external view returns (bool) {
        return _accounts[account].blacklist == 1;
    }

    // --- Token Locking/Vesting ---
    // --- Custom Errors for Gas Optimization ---
    error TokenTransferWhilePaused();
    error BlacklistedAddress();
    error TokensAreLocked();
    error LockTimeInFuture();

    function lockTokens(address account, uint256 untilTimestamp) external onlyOwner {
        if (untilTimestamp <= block.timestamp) revert LockTimeInFuture();
        uint48 until = uint48(untilTimestamp);
        if (_accounts[account].lockedUntil != until) {
            _accounts[account].lockedUntil = until;
            emit TokensLocked(account, untilTimestamp);
        }
    }
    function lockedUntil(address account) external view returns (uint48) {
        return _accounts[account].lockedUntil;
    }
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) {
        if (paused()) revert TokenTransferWhilePaused();
        if (_accounts[from].blacklist == 1 || _accounts[to].blacklist == 1) revert BlacklistedAddress();
        uint48 lockTime = _accounts[from].lockedUntil;
        if (lockTime > 0 && block.timestamp < lockTime) revert TokensAreLocked();
        super._beforeTokenTransfer(from, to, amount);
    }

}