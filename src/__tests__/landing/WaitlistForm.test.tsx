import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WaitlistForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should render email input and submit button", () => {
    render(<WaitlistForm />);

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
  });

  it("should show error for invalid email from API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email invalido" }),
    });

    render(<WaitlistForm />);

    const input = screen.getByTestId("email-input");
    const button = screen.getByTestId("submit-button");

    // This email has @ so it passes client validation but API rejects it
    fireEvent.change(input, { target: { value: "bad@email" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
    });
  });

  it("should show error for empty email", async () => {
    render(<WaitlistForm />);

    const button = screen.getByTestId("submit-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
    });
  });

  it("should submit valid email successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<WaitlistForm />);

    const input = screen.getByTestId("email-input");
    const button = screen.getByTestId("submit-button");

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("success-message")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
  });

  it("should show error when API returns error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Este email ja esta na lista" }),
    });

    render(<WaitlistForm />);

    const input = screen.getByTestId("email-input");
    const button = screen.getByTestId("submit-button");

    fireEvent.change(input, { target: { value: "existing@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Este email ja esta na lista")).toBeInTheDocument();
    });
  });

  it("should disable input and button while loading", async () => {
    // Create a promise that we can control
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    render(<WaitlistForm />);

    const input = screen.getByTestId("email-input");
    const button = screen.getByTestId("submit-button");

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    // Check that elements are disabled during loading
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true }),
    });
  });
});
