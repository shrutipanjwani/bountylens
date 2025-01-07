import Header from "@/components/Header";
import BountyForm from "@/components/BountyForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Header />
        <main className="mt-12">
          <div className="relative">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">
                  Create Smarter Bounties
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-12">
              <p className="text-center text-gray-600">
                Describe your idea and let AI help you create the perfect bounty
              </p>
            </div>
          </div>
          <BountyForm />
        </main>
      </div>
    </div>
  );
}
