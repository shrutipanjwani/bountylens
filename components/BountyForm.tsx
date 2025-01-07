"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Button from "./Button";
import lensAbi from "../constants/lens-abis/LensBounty.json";
import Link from "next/link";
import { useAccount } from "wagmi";

const CONTRACT_ADDRESSES = {
  lens: "0xFaE3cd09af9F77743c7009df3B42e253C0892aBA",
};

interface ChainConfig {
  chainId: string;
  name: string;
  currency: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const CHAIN_CONFIG: Record<string, ChainConfig> = {
  lens: {
    chainId: "0x90F7",
    name: "Lens Network Sepolia Testnet",
    currency: "GRASS",
    rpcUrl: "https://rpc.testnet.lens.dev",
    nativeCurrency: {
      name: "GRASS",
      symbol: "GRASS",
      decimals: 18,
    },
  },
};

export default function BountyForm() {
  const [prompt, setPrompt] = useState("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [generatedBounty, setGeneratedBounty] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("lens");
  const [txSuccess, setTxSuccess] = useState(false);
  const [bountyId, setBountyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const generateBounty = async () => {
    if (address) {
      setLoadingGenerate(true);
      try {
        const response = await fetch("/api/generate-bounty", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idea: prompt }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate bounty");
        }

        const bountyData = await response.json();
        setGeneratedBounty({
          title: bountyData.title,
          description: bountyData.description,
        });
      } catch (error) {
        console.error("Error generating bounty:", error);
        // Optionally add user-facing error handling here
      } finally {
        setLoadingGenerate(false);
      }
    } else {
      setTimeout(function () {
        setError("Please connect your wallet");
      }, 2000);
    }
  };

  const handleSubmit = async () => {
    if (!generatedBounty) return;
    setTxSuccess(false);
    setLoadingSubmit(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to create bounties");
      }

      // Request account access if needed
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const currentContractAddress =
        CONTRACT_ADDRESSES[chain as keyof typeof CONTRACT_ADDRESSES];
      if (!currentContractAddress) {
        throw new Error("Contract not deployed on this network");
      }

      // Use different ABI for Lens network
      const contractAbi = chain === "lens" ? lensAbi : "";
      const contract = new ethers.Contract(
        currentContractAddress,
        contractAbi,
        signer
      );

      // Use different method for Lens network
      const tx =
        chain === "lens"
          ? await contract.createBounty(
              generatedBounty.title,
              generatedBounty.description,
              { value: ethers.utils.parseEther(amount) }
            )
          : await contract.createSoloBounty(
              generatedBounty.title,
              generatedBounty.description,
              { value: ethers.utils.parseEther(amount) }
            );

      try {
        const receipt = await tx.wait();
        const bountyCreatedEvent = receipt.events?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (event: any) => event.event === "BountyCreated"
        );

        if (bountyCreatedEvent) {
          const id = bountyCreatedEvent.args.id.toString();
          setBountyId(id);
          setTxSuccess(true);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (waitError: any) {
        if (waitError?.transactionHash) {
          setTxSuccess(true);
          setBountyId("pending");
          console.log("Transaction successful:", waitError.transactionHash);
        } else {
          throw waitError;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating bounty:", error);
      if (!error?.transactionHash) {
        setError(
          error?.message || "Failed to create bounty. Please try again."
        );
      } else {
        setTxSuccess(true);
        setBountyId("pending");
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Add a useEffect to reset the form after showing the success message
  useEffect(() => {
    if (txSuccess) {
      const timer = setTimeout(() => {
        setAmount("");
        setPrompt("");
        setGeneratedBounty(null);
      }, 500000); // Reset the form after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [txSuccess]);

  const switchNetwork = async (selectedChain: string) => {
    try {
      // const provider = new ethers.providers.Web3Provider(window.ethereum);
      const chainConfig =
        CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG];

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainConfig.chainId }],
      });

      setChain(selectedChain);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        try {
          const chainConfig =
            CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG];
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainConfig.chainId,
                chainName: chainConfig.name,
                rpcUrls: [chainConfig.rpcUrl],
                nativeCurrency: chainConfig.nativeCurrency,
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding chain:", addError);
        }
      }
      console.error("Error switching chain:", error);
    }
  };

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChain = e.target.value;
    switchNetwork(selectedChain);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          <p className="mb-2">{error}</p>
        </div>
      )}
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your bounty idea... (e.g., 'Looking for a developer to create a DeFi dashboard' or 'Need artistic NFT designs for a collection')"
          className="w-full h-32 p-4 text-gray-900 bg-white rounded-[20px] outline-none"
        />
        <Button
          onClick={generateBounty}
          disabled={!prompt || loadingGenerate}
          className="w-full"
        >
          {loadingGenerate ? "Generating..." : "Generate Bounty"}
        </Button>
      </div>

      {generatedBounty && (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Generated Title
            </h3>
            <p className="bg-gray-50 p-3 rounded text-gray-700">
              {generatedBounty.title}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Generated Description
            </h3>
            <p className="bg-gray-50 p-3 rounded text-gray-700">
              {generatedBounty.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-900 font-medium mb-2">
                Chain
              </label>
              <select
                value={chain}
                onChange={handleChainChange}
                className="w-full p-2 border rounded text-gray-700 outline-none"
              >
                <option value="lens">Lens Network</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Amount (
                {CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].currency})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded text-gray-700"
                placeholder="0.1"
                step="0.01"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount || !chain || loadingSubmit}
            className="w-full"
          >
            {loadingSubmit ? "Processing..." : "Create Bounty"}
          </Button>

          {txSuccess && bountyId && (
            <div className="mt-4 p-4 bg-green-50 text-gray-800 rounded-lg">
              <p className="mb-2">Bounty created successfully!</p>
              {chain === "lens" && (
                <Link
                  href={`/lens/bounty/${bountyId}`}
                  className="text-blue-600 text-sm hover:underline"
                >
                  View your Lens bounty →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
