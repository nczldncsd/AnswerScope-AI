import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with loading state", () => {
    render(<Button loading>Submitting</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByText("Submitting")).toBeInTheDocument();
  });

  it("supports ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: "Ghost" })).toHaveClass("border");
  });
});
