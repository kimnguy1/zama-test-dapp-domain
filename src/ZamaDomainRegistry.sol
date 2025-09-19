// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { TFHE, eaddress } from "fhevm-solidity/lib/TFHE.sol";

contract ZamaDomainRegistry {
    mapping(bytes32 => eaddress) private domainOwner;
    mapping(bytes32 => bool) private registered;   // thêm flag này
    mapping(bytes32 => string) public nameOf;

    event DomainRegistered(bytes32 indexed nameHash, eaddress owner, address indexed registrar);
    event DomainTransferred(bytes32 indexed nameHash, eaddress newOwner, address indexed by);

    function registerDomain(string calldata name, eaddress encryptedOwner) external {
        bytes32 nh = _nameHash(name);
        require(!registered[nh], "already registered");

        domainOwner[nh] = encryptedOwner;
        registered[nh] = true;
        nameOf[nh] = name;

        emit DomainRegistered(nh, encryptedOwner, msg.sender);
    }

    function transferDomain(string calldata name, eaddress newEncryptedOwner) external {
        bytes32 nh = _nameHash(name);
        require(registered[nh], "not registered");

        domainOwner[nh] = newEncryptedOwner;

        emit DomainTransferred(nh, newEncryptedOwner, msg.sender);
    }

    function resolveOwnerHandle(string calldata name) external view returns (eaddress) {
        return domainOwner[_nameHash(name)];
    }

    function _nameHash(string memory name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(name, ".zama"));
    }
}
