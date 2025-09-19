// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { ZamaDomainRegistry } from "../src/ZamaDomainRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        ZamaDomainRegistry registry = new ZamaDomainRegistry();

        console.log("ZamaDomainRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
