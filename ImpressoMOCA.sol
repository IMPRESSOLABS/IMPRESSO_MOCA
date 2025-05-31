// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// NOTE: Custom storage variables must be declared before inherited contracts for upgradeable compatibility
struct AccountData {
    uint48 lockedUntil;
    uint8 blacklist;
}

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract ImpressoMOCA is ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ERC20SnapshotUpgradeable, AccessControlUpgradeable {
    // --- RBAC Roles ---
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Custom storage mapping must be before inherited contracts' storage gaps
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
        __AccessControl_init();
        // Grant roles to deployer (msg.sender)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // --- Mintable & Burnable ---
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(amount > 0, "Mint amount must be greater than zero");
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyOwner whenNotPaused {
        _burn(msg.sender, amount);
    }

    // --- Pausable ---
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setBlacklist(address account, bool status) external onlyOwner {
        uint8 s = status ? uint8(1) : uint8(0);
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

    // Reserve storage gap for future upgrades
    uint256[50] private __gap;
}