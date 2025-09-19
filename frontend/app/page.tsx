"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Wallet, Globe, CheckCircle, AlertCircle, Loader2, LogOut } from "lucide-react"

// Contract configuration
const CONTRACT_ADDRESS = "0x64C68a9dE828712C3DfC9867Ed619E24f140c749"
const CONTRACT_ABI = [
  {
    type: "function",
    name: "nameOf",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerDomain",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "encryptedOwner",
        type: "uint256",
        internalType: "eaddress",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveOwnerHandle",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "eaddress",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferDomain",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "newEncryptedOwner",
        type: "uint256",
        internalType: "eaddress",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "DomainRegistered",
    inputs: [
      {
        name: "nameHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "owner",
        type: "uint256",
        indexed: false,
        internalType: "eaddress",
      },
      {
        name: "registrar",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DomainTransferred",
    inputs: [
      {
        name: "nameHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newOwner",
        type: "uint256",
        indexed: false,
        internalType: "eaddress",
      },
      {
        name: "by",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
]

interface TransactionLog {
  hash: string
  domain: string
  timestamp: Date
  status: "pending" | "success" | "failed"
}

export default function ZamaDomainRegistry() {
  const [account, setAccount] = useState<string>("")
  const [domainName, setDomainName] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isCheckingDomain, setIsCheckingDomain] = useState(false)
  const [isDomainTaken, setIsDomainTaken] = useState<boolean | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([])
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const isMetaMaskInstalled = () => {
    return typeof window !== "undefined" && typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask
  }

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError("MetaMask is not installed. Please install MetaMask to continue.")
      return
    }

    setIsConnecting(true)
    setError("")

    try {
      let ethereum = window.ethereum
      if (window.ethereum.providers) {
        ethereum = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
        if (!ethereum) {
          setError("MetaMask not found. Please make sure MetaMask is installed and enabled.")
          return
        }
      }

      console.log("[v0] Attempting to connect to MetaMask...")
      const provider = new ethers.BrowserProvider(ethereum)

      try {
        await provider.send("eth_requestAccounts", [])
        console.log("[v0] eth_requestAccounts successful")
      } catch (requestError) {
        console.error("[v0] Failed to request accounts:", requestError)
        setError("Failed to connect to MetaMask. Please allow the connection in the popup.")
        setIsConnecting(false)
        return
      }

      const network = await provider.getNetwork()
      console.log("[v0] Current network:", network.chainId, network.name)

      if (network.chainId !== 11155111n) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }], // Sepolia chainId in hex
          })
          window.location.reload()
          return
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa36a7",
                    chainName: "Sepolia Test Network",
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["https://sepolia.infura.io/v3/"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io/"],
                  },
                ],
              })
              window.location.reload()
              return
            } catch (addError) {
              setError("Please manually switch to Sepolia testnet in MetaMask")
              return
            }
          }
          setError("Please switch to Sepolia testnet in MetaMask")
          return
        }
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      setProvider(provider)
      setContract(contract)
      setAccount(address)
      setSuccess("Wallet connected successfully!")

      console.log("[v0] Connected to:", address, "on network:", network.name)
    } catch (err: any) {
      console.log("[v0] Connection error:", err)
      setError(`Failed to connect wallet: ${err.message || "Unknown error"}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount("")
    setProvider(null)
    setContract(null)
    setSuccess("")
    setError("")
    setDomainName("")
    setIsDomainTaken(null)
  }

  const checkDomainAvailability = async (domain: string) => {
    if (!contract || !domain.trim()) {
      setIsDomainTaken(null)
      return
    }

    setIsCheckingDomain(true)
    try {
      console.log("[v0] Checking domain availability for:", domain)

      const ownerHandle = await contract.resolveOwnerHandle(domain.trim())
      console.log("[v0] Owner handle result:", ownerHandle)

      const isAvailable =
        ownerHandle === 0n || ownerHandle === "0x0000000000000000000000000000000000000000000000000000000000000000"
      setIsDomainTaken(!isAvailable)

      console.log("[v0] Domain availability:", isAvailable ? "available" : "taken")
    } catch (err: any) {
      console.log("[v0] Domain check error (might mean available):", err)
      setIsDomainTaken(false)
    } finally {
      setIsCheckingDomain(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (domainName.trim() && contract) {
        checkDomainAvailability(domainName.trim())
      } else {
        setIsDomainTaken(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [domainName, contract])

  const waitForFhevm = () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const timeout = 15000 // Tăng timeout lên 15 giây
      const checkFhevm = () => {
        console.log("[v0] Checking for window.fhevm...")
        if (window.fhevm) {
          console.log("[v0] window.fhevm detected")
          resolve(window.fhevm)
        } else if (Date.now() - startTime > timeout) {
          console.error("[v0] Timeout waiting for Zama SDK")
          reject(new Error("Zama SDK not loaded within timeout. Check CDN script and network."))
        } else {
          setTimeout(checkFhevm, 100)
        }
      }
      checkFhevm()
    })
  }

  const registerDomain = async () => {
    if (!contract || !account || !domainName.trim()) {
      setError("Please connect wallet and enter a domain name")
      return
    }

    if (isDomainTaken) {
      setError("This domain is already registered by someone else")
      return
    }

    setIsRegistering(true)
    setError("")
    setSuccess("")

    try {
      console.log("[v0] Starting domain registration process...")

      // Chờ window.fhevm sẵn sàng
      const fhevm = await waitForFhevm()
      console.log("[v0] Zama SDK loaded:", fhevm)

      await fhevm.initSDK()
      console.log("[v0] SDK initialized successfully")

      const config = {
        ...fhevm.SepoliaConfig,
        network: window.ethereum,
        gatewayUrl: "https://gateway.sepolia.zama.cloud",
      }

      const instance = await fhevm.createInstance(config)
      console.log("[v0] FHE instance created successfully:", instance)

      console.log("[v0] Creating encrypted input...")
      let input
      try {
        input = instance.createEncryptedInput(CONTRACT_ADDRESS, account)
        console.log("[v0] Encrypted input created successfully:", input)
      } catch (inputError) {
        console.error("[v0] Failed to create encrypted input:", inputError)
        throw new Error(`Failed to create encrypted input: ${inputError.message}`)
      }

      if (!input || !input.addAddress) {
        throw new Error("Encrypted input is invalid or missing addAddress method")
      }

      console.log("[v0] Adding address to input...")
      input.addAddress(account)

      console.log("[v0] Encrypting input...")
      let encryptedInput
      try {
        encryptedInput = await input.encrypt()
        console.log("[v0] Encryption successful with direct method:", encryptedInput)
      } catch (encryptError) {
        console.log("[v0] Direct encrypt failed, trying alternative approaches:", encryptError)

        try {
          const encryptMethod = input.encrypt.bind(input)
          encryptedInput = await encryptMethod()
          console.log("[v0] Encryption successful with bind method:", encryptedInput)
        } catch (bindError) {
          console.log("[v0] Bind encrypt failed, trying manual approach:", bindError)

          try {
            if (input._input && typeof input._input.encrypt === "function") {
              encryptedInput = await input._input.encrypt()
              console.log("[v0] Encryption successful with internal method:", encryptedInput)
            } else {
              throw new Error("No internal encrypt method found")
            }
          } catch (internalError) {
            console.log("[v0] Internal encrypt failed, trying constructor fix:", internalError)

            try {
              const newInput = instance.createEncryptedInput(CONTRACT_ADDRESS, account)
              newInput.addAddress(account)

              const encryptFunc = newInput.encrypt
              if (encryptFunc) {
                encryptedInput = await Promise.resolve(encryptFunc.call(newInput))
                console.log("[v0] Encryption successful with context fix:", encryptedInput)
              } else {
                throw new Error("Encrypt function not found on new input")
              }
            } catch (contextError) {
              console.error("[v0] All encryption methods failed:", contextError)
              throw new Error(`Failed to encrypt input after trying multiple approaches: ${encryptError.message}`)
            }
          }
        }
      }

      let encryptedAddress
      let inputProof

      console.log("[v0] Processing encrypted result:", typeof encryptedInput, encryptedInput)

      if (!encryptedInput) {
        throw new Error("Encryption failed - no result returned")
      }

      if (encryptedInput.handles && Array.isArray(encryptedInput.handles) && encryptedInput.handles.length > 0) {
        encryptedAddress = encryptedInput.handles[0]
        inputProof = encryptedInput.inputProof
        console.log("[v0] Using handles format - Address handle:", encryptedAddress)
      } else if (
        Array.isArray(encryptedInput) ||
        (encryptedInput.length !== undefined && typeof encryptedInput !== "string")
      ) {
        let hexString = "0x"
        const maxLength = Math.min(encryptedInput.length, 32)

        for (let i = 0; i < maxLength; i++) {
          const byte = encryptedInput[i] || 0
          hexString += byte.toString(16).padStart(2, "0")
        }

        if (encryptedInput.length > 32) {
          hexString = "0x"
          for (let i = 0; i < 32; i++) {
            const byte = encryptedInput[i] || 0
            hexString += byte.toString(16).padStart(2, "0")
          }
        }

        encryptedAddress = hexString
        inputProof = "0x"
        console.log("[v0] Using buffer format - Converted to hex:", encryptedAddress)
      } else if (typeof encryptedInput === "object") {
        const possibleHandles = ["handle", "encrypted", "result", "data", "value"]
        let found = false

        for (const prop of possibleHandles) {
          if (encryptedInput[prop] !== undefined) {
            encryptedAddress = encryptedInput[prop]
            inputProof = encryptedInput.proof || encryptedInput.inputProof || "0x"
            console.log("[v0] Using property format - Found:", prop, encryptedAddress)
            found = true
            break
          }
        }

        if (!found) {
          const keys = Object.keys(encryptedInput)
          if (keys.length > 0 && keys.every((key) => !isNaN(Number.parseInt(key)))) {
            let hexString = "0x"
            const maxLength = Math.min(keys.length, 32)

            for (let i = 0; i < maxLength; i++) {
              const byte = encryptedInput[i] || 0
              hexString += byte.toString(16).padStart(2, "0")
            }

            encryptedAddress = hexString
            inputProof = "0x"
            console.log("[v0] Using buffer-like object - Converted to hex:", encryptedAddress)
          } else {
            encryptedAddress = encryptedInput
            inputProof = "0x"
            console.log("[v0] Using entire object as encrypted address")
          }
        }
      } else {
        encryptedAddress = encryptedInput
        inputProof = "0x"
        console.log("[v0] Using direct result as encrypted address")
      }

      if (!encryptedAddress) {
        throw new Error("Could not extract encrypted address from result")
      }

      if (typeof encryptedAddress === "object" && !Array.isArray(encryptedAddress)) {
        if (encryptedAddress.toString) {
          encryptedAddress = encryptedAddress.toString()
        } else {
          throw new Error("Cannot convert encrypted address to valid format for contract")
        }
      }

      console.log("[v0] Final encrypted address:", encryptedAddress)
      console.log("[v0] Final input proof:", inputProof)

      const pendingLog: TransactionLog = {
        hash: "pending",
        domain: domainName.trim(),
        timestamp: new Date(),
        status: "pending",
      }
      setTransactionLogs((prev) => [pendingLog, ...prev])

      console.log("[v0] Calling registerDomain contract function...")
      const tx = await contract.registerDomain(domainName.trim(), encryptedAddress)

      console.log("[v0] Transaction sent:", tx.hash)

      setTransactionLogs((prev) =>
        prev.map((log) =>
          log.hash === "pending" && log.domain === domainName.trim() ? { ...log, hash: tx.hash } : log
        )
      )

      const receipt = await tx.wait()

      console.log("[v0] Transaction receipt:", receipt)

      if (receipt.status === 1) {
        setSuccess(`Domain "${domainName.trim()}.zama" registered successfully!`)
        setTransactionLogs((prev) => prev.map((log) => (log.hash === tx.hash ? { ...log, status: "success" } : log)))
        setDomainName("")
      } else {
        throw new Error("Transaction failed")
      }
    } catch (err: any) {
      console.error("[v0] Registration error:", err)
      setError(`Registration failed: ${err.message}`)
      setTransactionLogs((prev) =>
        prev.map((log) =>
          log.hash === "pending" || (log.domain === domainName.trim() && log.status === "pending")
            ? { ...log, status: "failed" }
            : log
        )
      )
    } finally {
      setIsRegistering(false)
    }
  }

  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const ethereum = window.ethereum.providers?.find((provider: any) => provider.isMetaMask) || window.ethereum

      const handleChainChanged = (chainId: string) => {
        console.log("[v0] Chain changed to:", chainId)
        if (account) {
          window.location.reload()
        }
      }

      const handleAccountsChanged = (accounts: string[]) => {
        console.log("[v0] Accounts changed:", accounts)
        if (accounts.length === 0) {
          setAccount("")
          setProvider(null)
          setContract(null)
          setSuccess("")
          setError("")
        } else if (accounts[0] !== account) {
          connectWallet()
        }
      }

      ethereum.on("chainChanged", handleChainChanged)
      ethereum.on("accountsChanged", handleAccountsChanged)

      return () => {
        ethereum.removeListener("chainChanged", handleChainChanged)
        ethereum.removeListener("accountsChanged", handleAccountsChanged)
      }
    }
  }, [account])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Zama Domain Registry</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Register your .zama domain on Sepolia testnet with FHE encryption
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>Connect your MetaMask wallet to register domains</CardDescription>
          </CardHeader>
          <CardContent>
            {!account ? (
              <Button onClick={connectWallet} disabled={isConnecting} className="w-full">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Connected
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Button variant="outline" size="sm" onClick={disconnectWallet}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Register Domain
            </CardTitle>
            <CardDescription>Enter your desired domain name (without .zama extension)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter domain name"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  disabled={!account || isRegistering}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-500">Domain will be: {domainName.trim() || "your-domain"}.zama</p>
                  {domainName.trim() && account && (
                    <div className="flex items-center gap-1">
                      {isCheckingDomain ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-gray-500">Checking...</span>
                        </>
                      ) : isDomainTaken === true ? (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-500">Taken</span>
                        </>
                      ) : isDomainTaken === false ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-500">Available</span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={registerDomain}
              disabled={!account || !domainName.trim() || isRegistering || isDomainTaken === true}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering Domain...
                </>
              ) : isDomainTaken === true ? (
                "Domain Already Taken"
              ) : (
                "Register Domain"
              )}
            </Button>
          </CardContent>
        </Card>

        {isDomainTaken === true && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The domain "{domainName.trim()}.zama" is already registered by someone else. Please choose a different
              name.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {transactionLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent domain registration transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactionLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.domain}.zama</p>
                      <p className="text-sm text-gray-500">{log.timestamp.toLocaleString()}</p>
                      {log.hash !== "pending" && (
                        <p className="text-xs text-gray-400 font-mono">
                          {log.hash.slice(0, 10)}...{log.hash.slice(-8)}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {log.status === "pending" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
