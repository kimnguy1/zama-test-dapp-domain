// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ZamaDomainRegistry.sol";

contract ZamaDomainRegistryTest is Test {
    ZamaDomainRegistry registry;

    // Mock eaddress bằng address cast
    function _wrap(address a) internal pure returns (eaddress) {
        return eaddress.wrap(a);
    }

    function setUp() public {
        registry = new ZamaDomainRegistry();
    }

    function testRegisterDomain() public {
        string memory name = "alice";
        address owner = address(0x123);

        registry.registerDomain(name, _wrap(owner));

        eaddress stored = registry.resolveOwnerHandle(name);
        assertEq(eaddress.unwrap(stored), owner);
    }

    function testCannotDoubleRegister() public {
        string memory name = "bob";
        address owner = address(0x456);

        registry.registerDomain(name, _wrap(owner));
        vm.expectRevert("already registered");
        registry.registerDomain(name, _wrap(owner));
    }

    function testTransferDomain() public {
        string memory name = "carol";
        address owner1 = address(0x111);
        address owner2 = address(0x222);

        registry.registerDomain(name, _wrap(owner1));
        registry.transferDomain(name, _wrap(owner2));

        eaddress stored = registry.resolveOwnerHandle(name);
        assertEq(eaddress.unwrap(stored), owner2);
    }
}
