import {
  Hero,
  Problem,
  HowItWorks,
  Features,
  Comparison,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Comparison />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
