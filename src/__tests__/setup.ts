import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => {
  const createMockComponent = (tag: string) => {
    return function MockComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
      // Remove framer-motion specific props
      const {
        initial,
        animate,
        transition,
        whileInView,
        viewport,
        whileHover,
        whileTap,
        exit,
        variants,
        ...rest
      } = props;
      return React.createElement(tag, rest, children);
    };
  };

  return {
    motion: {
      div: createMockComponent("div"),
      h1: createMockComponent("h1"),
      h2: createMockComponent("h2"),
      p: createMockComponent("p"),
      span: createMockComponent("span"),
      section: createMockComponent("section"),
      button: createMockComponent("button"),
      a: createMockComponent("a"),
      ul: createMockComponent("ul"),
      li: createMockComponent("li"),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
