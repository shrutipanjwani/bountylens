import Header from "@/components/Header";
import BountyForm from "@/components/BountyForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Header />
        <main className="mt-16">
          <div className="relative">
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">
                  Create AI-Enhanced Bounties on Lens
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mb-12">
              <p className="font-og-simple text-center text-gray-600">
                An AI-powered decentralized bounty platform built on Lens
                Protocol
              </p>
            </div>
          </div>
          <BountyForm />
        </main>
      </div>
    </div>
  );
}
