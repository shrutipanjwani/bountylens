/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, use } from "react";
import { ethers } from "ethers";
import Button from "@/components/Button";
import lensAbi from "@/constants/lens-abis/LensBounty.json";
import Header from "@/components/Header";

const LENS_CONTRACT = "0xFaE3cd09af9F77743c7009df3B42e253C0892aBA";
const LENS_CHAIN_ID = "0x90F7"; // Lens Network Sepolia Testnet

interface Bounty {
  id: string;
  issuer: string;
  name: string;
  description: string;
  amount: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}

interface Claim {
  id: string;
  issuer: string;
  name: string;
  description: string;
  createdAt: string;
  accepted: boolean;
}

export default function BountyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bountyId, setBountyId] = useState<string>(resolvedParams.id);

  useEffect(() => {
    setBountyId(resolvedParams.id);
  }, [resolvedParams]);

  useEffect(() => {
    if (bountyId) {
      loadBountyDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bountyId]);

  const loadBountyDetails = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://rpc.testnet.lens.dev"
      );
      const contract = new ethers.Contract(LENS_CONTRACT, lensAbi, provider);

      const bountyData = await contract.bounties(bountyId);
      const bountyDetails: Bounty = {
        id: bountyData.id.toString(),
        issuer: bountyData.issuer,
        name: bountyData.name,
        description: bountyData.description,
        amount: ethers.utils.formatEther(bountyData.amount),
        claimer: bountyData.claimer,
        createdAt: new Date(
          Number(bountyData.createdAt) * 1000
        ).toLocaleString(),
        claimId: bountyData.claimId.toString(),
      };

      setBounty(bountyDetails);

      const claimsData = await contract.getClaimsByBountyId(bountyId);
      const formattedClaims = claimsData.map((claim: any) => ({
        id: claim.id.toString(),
        issuer: claim.issuer,
        name: claim.name,
        description: claim.description,
        createdAt: new Date(Number(claim.createdAt) * 1000).toLocaleString(),
        accepted: claim.accepted,
      }));

      setClaims(formattedClaims);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to submit claims");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Check and switch network if needed
      const network = await provider.getNetwork();
      if (network.chainId !== parseInt(LENS_CHAIN_ID, 16)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: LENS_CHAIN_ID }],
          });
          // Get new provider instance after network switch
          provider = new ethers.providers.Web3Provider(window.ethereum);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: LENS_CHAIN_ID,
                    chainName: "Lens Network Sepolia Testnet",
                    rpcUrls: ["https://rpc.testnet.lens.dev"],
                    nativeCurrency: {
                      name: "GRASS",
                      symbol: "GRASS",
                      decimals: 18,
                    },
                  },
                ],
              });
              provider = new ethers.providers.Web3Provider(window.ethereum);
            } catch (addError) {
              setError("Failed to add Lens Network to MetaMask");
              return;
            }
          } else {
            setError("Failed to switch to Lens Network");
            return;
          }
        }
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(LENS_CONTRACT, lensAbi, signer);

      // First check if the bounty exists and is still open
      const bountyData = await contract.bounties(bountyId);
      if (!bountyData || bountyData.claimer !== ethers.constants.AddressZero) {
        throw new Error("Bounty is not available for claiming");
      }

      // Check if the caller is not the bounty issuer
      const address = await signer.getAddress();
      if (bountyData.issuer.toLowerCase() === address.toLowerCase()) {
        throw new Error("Bounty issuer cannot submit a claim");
      }

      console.log("Submitting claim with params:", {
        bountyId: bountyId,
        claimName,
        claimDescription,
      });

      // Estimate gas first
      const gasEstimate = await contract.estimateGas.createClaim(
        bountyId,
        claimName,
        "ipfs://",
        claimDescription
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await contract.createClaim(
        bountyId,
        claimName,
        "ipfs://",
        claimDescription,
        {
          gasLimit: gasLimit,
        }
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error(
          "Transaction failed. Please check if the bounty is still available."
        );
      }

      console.log("Transaction confirmed:", receipt);
      await loadBountyDetails();
      setClaimName("");
      setClaimDescription("");
    } catch (err: any) {
      console.error("Detailed error:", err);

      let errorMessage = "Failed to submit claim. ";
      if (err.error?.data?.message) {
        errorMessage += err.error.data.message;
      } else if (err.data?.message) {
        errorMessage += err.data.message;
      } else if (err.message) {
        // Remove the technical details from the error message
        errorMessage += err.message.split("(")[0].trim();
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const acceptClaim = async (claimId: string) => {
    if (!window.ethereum) {
      setError("Please install MetaMask to accept claims");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Check and switch network if needed
      const network = await provider.getNetwork();
      if (network.chainId !== parseInt(LENS_CHAIN_ID, 16)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: LENS_CHAIN_ID }],
          });
          provider = new ethers.providers.Web3Provider(window.ethereum);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: LENS_CHAIN_ID,
                    chainName: "Lens Network Sepolia Testnet",
                    rpcUrls: ["https://rpc.testnet.lens.dev"],
                    nativeCurrency: {
                      name: "GRASS",
                      symbol: "GRASS",
                      decimals: 18,
                    },
                  },
                ],
              });
              provider = new ethers.providers.Web3Provider(window.ethereum);
            } catch (addError) {
              setError("Failed to add Lens Network to MetaMask");
              return;
            }
          } else {
            setError("Failed to switch to Lens Network");
            return;
          }
        }
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();

      // Verify that the user is the bounty issuer
      if (bounty?.issuer.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Only the bounty issuer can accept claims");
      }

      const contract = new ethers.Contract(LENS_CONTRACT, lensAbi, signer);

      // Estimate gas first
      const gasEstimate = await contract.estimateGas.acceptClaim(
        bountyId,
        claimId
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await contract.acceptClaim(bountyId, claimId, {
        gasLimit: gasLimit,
      });

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error(
          "Transaction failed. The claim might already be accepted."
        );
      }

      console.log("Transaction confirmed:", receipt);
      await loadBountyDetails();
    } catch (err: any) {
      console.error("Detailed error:", err);

      let errorMessage = "Failed to accept claim. ";
      if (err.error?.data?.message) {
        errorMessage += err.error.data.message;
      } else if (err.data?.message) {
        errorMessage += err.data.message;
      } else if (err.message) {
        errorMessage += err.message.split("(")[0].trim();
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!bounty) return <div className="p-4">Bounty not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Header />
        <div className="bg-white rounded-lg shadow p-6 mt-12">
          <h1 className="text-2xl font-bold mb-4">{bounty.name}</h1>
          <div className="space-y-4">
            <p className="text-gray-600">{bounty.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Amount:</span> {bounty.amount}{" "}
                GRASS
              </div>
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {bounty.createdAt}
              </div>
              <div>
                <span className="font-semibold">Issuer:</span> {bounty.issuer}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {bounty.claimer === ethers.constants.AddressZero
                  ? "Open"
                  : "Claimed"}
              </div>
            </div>
          </div>
        </div>

        {bounty.claimer === ethers.constants.AddressZero && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Submit a Claim</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claim Title
                </label>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter your claim title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claim Description
                </label>
                <textarea
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  className="w-full p-2 border rounded h-32"
                  placeholder="Describe how you completed the bounty"
                />
              </div>
              <Button
                onClick={submitClaim}
                disabled={submitting || !claimName || !claimDescription}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </div>
        )}

        {claims.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Claims</h2>
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border rounded p-4">
                  <h3 className="font-semibold">{claim.name}</h3>
                  <p className="text-gray-600 mt-2">{claim.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    Submitted by {claim.issuer} on {claim.createdAt}
                  </div>
                  {claim.accepted ? (
                    <div className="mt-2 text-green-600 font-semibold">
                      ✓ Accepted
                    </div>
                  ) : (
                    bounty.issuer.toLowerCase() ===
                      window.ethereum?.selectedAddress?.toLowerCase() && (
                      <Button
                        onClick={() => acceptClaim(claim.id)}
                        disabled={submitting}
                        className="mt-2"
                      >
                        {submitting ? "Processing..." : "Accept Claim"}
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
