"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Clock, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import lensAbi from "@/constants/lens-abis/LensBounty.json";

const LENS_CONTRACT = "0xFaE3cd09af9F77743c7009df3B42e253C0892aBA";

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

const DiscoverFeed = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBounties();
  }, []);

  const loadBounties = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://rpc.testnet.lens.dev"
      );
      const contract = new ethers.Contract(LENS_CONTRACT, lensAbi, provider);

      // Get total bounties length
      const totalBounties = await contract.getBountiesLength();
      let currentOffset = 0;
      const allBounties = [];

      // Fetch bounties in batches of 10 using getBounties function
      while (currentOffset < totalBounties.toNumber()) {
        const bountyBatch = await contract.getBounties(currentOffset);

        // Filter out empty bounties and format the data
        const formattedBounties = bountyBatch
          .filter((bounty: any) => bounty.id.toString() !== "0")
          .map((bounty: any) => ({
            id: bounty.id.toString(),
            issuer: bounty.issuer,
            name: bounty.name,
            description: bounty.description,
            amount: ethers.utils.formatEther(bounty.amount),
            claimer: bounty.claimer,
            createdAt: new Date(
              Number(bounty.createdAt) * 1000
            ).toLocaleString(),
            claimId: bounty.claimId.toString(),
          }));

        allBounties.push(...formattedBounties);
        currentOffset += 10;
      }

      setBounties(allBounties);
    } catch (err: any) {
      console.error("Error loading bounties:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center p-4 text-red-500">
        Error loading bounties: {error}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discover Bounties</h1>
        <p className="text-gray-600 mt-2">
          Find exciting opportunities in the Lens ecosystem
        </p>
      </div>

      <div className="space-y-6">
        {bounties.map((bounty) => (
          <Link href={`/lens/bounty/${bounty.id}`} key={bounty.id}>
            <div className="bg-white mb-4 rounded-[20px] p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {bounty.name}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <User className="w-4 h-4 mr-1" />
                    {bounty.issuer.slice(0, 6)}...{bounty.issuer.slice(-4)}
                  </p>
                </div>
                <div className="bg-neon text-green-800 px-4 py-1 rounded-full text-sm font-medium">
                  {bounty.amount} GRASS
                </div>
              </div>

              <p className="text-gray-600 mb-4">{bounty.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex gap-4">
                  <span className="flex items-center text-gray-500 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {bounty.createdAt}
                  </span>
                  <span className="flex items-center text-gray-500 text-sm">
                    {bounty.claimer === ethers.constants.AddressZero ? (
                      <span className="text-green-600">Open</span>
                    ) : (
                      <span className="text-gray-600">Claimed</span>
                    )}
                  </span>
                </div>

                <button className="flex items-center text-gray-800 hover:text-gray-800 font-medium">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DiscoverFeed;
