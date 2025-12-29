import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/components/landing/Hero";

describe("Hero", () => {
  it("should render the main headline", () => {
    render(<Hero />);

    expect(
      screen.getByText(/Grave 2 horas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Receba 30 minutos/i)
    ).toBeInTheDocument();
  });

  it("should render the subheadline", () => {
    render(<Hero />);

    expect(
      screen.getByText(/IA que edita seu podcast/i)
    ).toBeInTheDocument();
  });

  it("should render the waitlist form", () => {
    render(<Hero />);

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  it("should render trust indicators", () => {
    render(<Hero />);

    expect(screen.getByText(/Sem cartao de credito/i)).toBeInTheDocument();
    expect(screen.getByText(/Acesso antecipado/i)).toBeInTheDocument();
    expect(screen.getByText(/Vagas limitadas/i)).toBeInTheDocument();
  });

  it("should render the visual demo section", () => {
    render(<Hero />);

    expect(screen.getByText(/Audio original/i)).toBeInTheDocument();
    expect(screen.getByText(/Episodio editado/i)).toBeInTheDocument();
  });

  it("should render stats in the demo", () => {
    render(<Hero />);

    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("5h")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
