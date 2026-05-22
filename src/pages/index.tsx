import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import IntroScreen from "@/components/IntroScreen";
import UserInput from "@/components/UserInput";
import type { JourneyInput } from "@/types";

type Step = "intro" | "input";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (input: JourneyInput) => {
    setLoading(true);
    const params = new URLSearchParams({ surname: input.surname });
    if (input.country) params.set("country", input.country);
    if (input.decade) params.set("decade", input.decade);
    if (input.firstName) params.set("firstName", input.firstName);
    router.push(`/journey?${params.toString()}`);
  };

  return (
    <Layout title="Immigration Journey">
      {step === "intro" ? (
        <IntroScreen onStart={() => setStep("input")} />
      ) : (
        <UserInput onSubmit={handleSubmit} loading={loading} />
      )}
    </Layout>
  );
}
